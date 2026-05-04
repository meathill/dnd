import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import {
  buildAssistantMeta,
  chargeWallet,
  createGameMessage,
  getGameByIdForUser,
  listMessagesByGameId,
} from '@/lib/db/repositories';
import { sendGameplayMessage } from '@/lib/opencode/gameplay';

const TURN_COST = 5;

type GameMessagesRouteProps = {
  params: Promise<{ id: string }>;
};

type SendMessageRequest = {
  content?: string;
};

async function readSystemPrompt(): Promise<string> {
  const filePath = join(process.cwd(), '..', '..', 'prompts', 'dm-system-prompt.md');
  return readFile(filePath, 'utf8');
}

export async function GET(_: Request, { params }: GameMessagesRouteProps) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const { id } = await params;
  const game = await getGameByIdForUser(id, session.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }
  const messages = await listMessagesByGameId(game.id);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, { params }: GameMessagesRouteProps) {
  const session = await getRequestSession();
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

  if (session.balance < TURN_COST) {
    return NextResponse.json({ error: '余额不足' }, { status: 402 });
  }

  const { id } = await params;
  const game = await getGameByIdForUser(id, session.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }

  let systemPrompt;
  try {
    systemPrompt = await readSystemPrompt();
  } catch (error) {
    console.error('[api/games/messages] 读取系统提示词失败', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }

  let reply;
  try {
    reply = await sendGameplayMessage({
      game,
      content,
      systemPrompt,
    });
  } catch (error) {
    console.error('[api/games/messages] opencode 返回失败', error);
    return NextResponse.json({ error: '游戏服务暂不可用，请稍后重试' }, { status: 502 });
  }

  let userMessage;
  let assistantMessage;
  try {
    userMessage = await createGameMessage({
      gameId: game.id,
      role: 'user',
      content,
    });

    assistantMessage = await createGameMessage({
      gameId: game.id,
      role: 'assistant',
      content: reply.content,
      meta: buildAssistantMeta(reply.assistantMessage, {
        sessionId: reply.sessionId,
        partCount: reply.parts.length,
      }),
    });
  } catch (error) {
    console.error('[api/games/messages] 保存消息失败', error);
    return NextResponse.json({ error: '保存消息失败' }, { status: 500 });
  }

  try {
    const wallet = await chargeWallet({
      userId: session.userId,
      gameId: game.id,
      amount: TURN_COST,
      reason: `游戏回合扣费：${game.id}`,
    });

    return NextResponse.json({ userMessage, assistantMessage, balance: wallet.balance });
  } catch (error) {
    console.error('[api/games/messages] 扣费失败', error);
    if (error instanceof Error && error.message === '余额不足') {
      return NextResponse.json({ error: '余额不足' }, { status: 402 });
    }
    return NextResponse.json({ error: '扣费失败' }, { status: 500 });
  }
}
