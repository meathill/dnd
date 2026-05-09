import { NextResponse } from 'next/server';
import { createModuleDraft, getModuleDraftBySlug, listModuleDraftsForOwner } from '@/lib/db/module-drafts-repo';
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

  return NextResponse.json({ draft }, { status: 201 });
}
