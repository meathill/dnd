import { NextResponse } from 'next/server';
import { getGameByIdForUser, listMessagesByGameId } from '@/lib/db/repositories';
import { sendGameMessage } from '@/lib/game/runtime';
import { getRequestIdentity } from '@/lib/internal/request-auth';

type GameMessagesRouteProps = {
  params: Promise<{ id: string }>;
};

type SendMessageRequest = {
  content?: string;
};

export async function GET(_request: Request, { params }: GameMessagesRouteProps) {
  const identity = await getRequestIdentity();
  if (identity instanceof NextResponse) {
    return identity;
  }
  const { id } = await params;
  const game = await getGameByIdForUser(id, identity.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }
  const messages = await listMessagesByGameId(game.id);
  return NextResponse.json({ messages });
}

function resolveRuntimeErrorStatus(message: string): number {
  if (message === '余额不足') {
    return 402;
  }
  if (message === '游戏不存在') {
    return 404;
  }
  if (message === 'LLM 上游未配置' || message === '模型未开放' || message === '缺少模型标识') {
    return 503;
  }
  return 502;
}

export async function POST(request: Request, { params }: GameMessagesRouteProps) {
  const identity = await getRequestIdentity();
  if (identity instanceof NextResponse) {
    return identity;
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
    const { id } = await params;
    return NextResponse.json(await sendGameMessage(id, content, identity));
  } catch (error) {
    const message = error instanceof Error ? error.message : '发送失败';
    return NextResponse.json({ error: message }, { status: resolveRuntimeErrorStatus(message) });
  }
}
