import { NextResponse } from 'next/server';
import { listModuleDraftMessages } from '@/lib/db/module-drafts-repo';
import { sendAuthoringMessage } from '@/lib/game/authoring-runtime';
import { loadDraftForOwner } from '@/lib/internal/draft-auth';

type RouteContext = { params: Promise<{ id: string }> };

type SendMessageRequest = {
  content?: string;
};

function resolveErrorStatus(message: string): number {
  if (message === '消息不能为空') {
    return 400;
  }
  if (message === 'LLM 上游未配置' || message === '模型未开放' || message === '缺少模型标识') {
    return 503;
  }
  return 502;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }
  const messages = await listModuleDraftMessages(id);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }

  let body: SendMessageRequest;
  try {
    body = (await request.json()) as SendMessageRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
  }

  try {
    const result = await sendAuthoringMessage({ draft: access.draft, content });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '发送失败';
    return NextResponse.json({ error: message }, { status: resolveErrorStatus(message) });
  }
}
