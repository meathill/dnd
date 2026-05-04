import { NextResponse } from 'next/server';
import { sendPlayMessage } from '@/lib/play/runtime';
import { getPlaySession } from '@/lib/play/session';

type GameMessagesRouteProps = {
  params: Promise<{ id: string }>;
};

type SendMessageRequest = {
  content?: string;
};

export async function POST(request: Request, { params }: GameMessagesRouteProps) {
  const session = await getPlaySession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
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
    const reply = await sendPlayMessage(id, content, session);
    return NextResponse.json(reply);
  } catch (error) {
    const message = error instanceof Error ? error.message : '发送失败';
    const status = message === '余额不足' ? 402 : message === '游戏不存在' ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
