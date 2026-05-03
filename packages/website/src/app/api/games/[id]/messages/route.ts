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

  const systemPrompt = await readSystemPrompt();
  const userMessage = await createGameMessage({
    gameId: game.id,
    role: 'user',
    content,
  });

  const reply = await sendGameplayMessage({
    game,
    content,
    systemPrompt,
  });

  const assistantMessage = await createGameMessage({
    gameId: game.id,
    role: 'assistant',
    content: reply.content,
    meta: buildAssistantMeta(reply.assistantMessage, {
      sessionId: reply.sessionId,
      partCount: reply.parts.length,
    }),
  });

  const wallet = await chargeWallet({
    userId: session.userId,
    gameId: game.id,
    amount: TURN_COST,
    reason: `游戏回合扣费：${game.id}`,
  });

  return NextResponse.json({ userMessage, assistantMessage, balance: wallet.balance });
}
