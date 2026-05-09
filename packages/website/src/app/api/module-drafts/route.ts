import { NextResponse } from 'next/server';
import { AgentServerUnavailableError, createAgentSession, isAgentServerConfigured } from '@/lib/agent/client';
import {
  createModuleDraft,
  getModuleDraftBySlug,
  listModuleDraftsForOwner,
  setModuleDraftAgentSessionId,
} from '@/lib/db/module-drafts-repo';
import { requireEditor } from '@/lib/internal/draft-auth';
import { ensureModuleDraftWorkspace } from '@/lib/opencode/workspace';

type CreateDraftRequest = {
  slug?: string;
  title?: string;
  summary?: string;
  setting?: string;
  difficulty?: string;
  meta?: Record<string, unknown>;
};

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-_]{1,63}$/;

export async function GET() {
  const editor = await requireEditor();
  if (editor instanceof NextResponse) {
    return editor;
  }
  const drafts = await listModuleDraftsForOwner(editor.session.userId);
  return NextResponse.json({ drafts });
}

export async function POST(request: Request) {
  const editor = await requireEditor();
  if (editor instanceof NextResponse) {
    return editor;
  }

  let body: CreateDraftRequest;
  try {
    body = (await request.json()) as CreateDraftRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }

  const slug = body.slug?.trim().toLowerCase() ?? '';
  const title = body.title?.trim() ?? '';
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'slug 只能包含小写字母、数字、- 和 _，且长度 2-64' }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: '缺少标题' }, { status: 400 });
  }

  const existing = await getModuleDraftBySlug(slug);
  if (existing) {
    return NextResponse.json({ error: 'slug 已被占用' }, { status: 409 });
  }

  const workspacePath = await ensureModuleDraftWorkspace(slug);
  const draft = await createModuleDraft({
    slug,
    title,
    summary: body.summary?.trim() ?? '',
    setting: body.setting?.trim() ?? '',
    difficulty: body.difficulty?.trim() || '中等',
    ownerUserId: editor.session.userId,
    meta: body.meta,
    workspacePath,
  });

  // 仅当 agent-server 已配置时才远程开 session；否则草稿仍可创建，会话退化为 stub。
  if (await isAgentServerConfigured()) {
    try {
      const session = await createAgentSession({
        scenario: 'authoring',
        ownerId: editor.session.userId,
        externalRef: draft.id,
        moduleSlug: draft.slug,
        meta: draft.meta,
        initialModuleData: draft.data,
      });
      await setModuleDraftAgentSessionId(draft.id, session.id);
      draft.agentSessionId = session.id;
    } catch (error) {
      if (!(error instanceof AgentServerUnavailableError)) {
        console.error('[api/module-drafts] 创建 agent session 失败', error);
      }
    }
  }

  return NextResponse.json({ draft }, { status: 201 });
}
