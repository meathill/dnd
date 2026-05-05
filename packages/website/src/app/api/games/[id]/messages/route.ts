import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { buildAssistantMeta, getGameByIdForUser, listMessagesByGameId, recordGameTurn } from '@/lib/db/repositories';
import { isPlayManagedGame } from '@/lib/game/runtime';
import { getRequestIdentity } from '@/lib/internal/request-auth';
import type { OpencodeReply } from '@/lib/opencode/gameplay';
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

export async function GET(request: Request, { params }: GameMessagesRouteProps) {
  const identity = await getRequestIdentity(request);
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

export async function POST(request: Request, { params }: GameMessagesRouteProps) {
  const identity = await getRequestIdentity(request);
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

  if (typeof identity.balance === 'number' && identity.balance < TURN_COST) {
    return NextResponse.json({ error: '余额不足' }, { status: 402 });
  }

  const { id } = await params;
  const game = await getGameByIdForUser(id, identity.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }
  if (isPlayManagedGame(game)) {
    return NextResponse.json({ error: '当前游戏由 play 运行时托管，请前往游戏域继续' }, { status: 409 });
  }

  let systemPrompt: string;
  try {
    systemPrompt = await readSystemPrompt();
  } catch (error) {
    console.error('[api/games/messages] 读取系统提示词失败', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }

  let reply: OpencodeReply;
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

  try {
    const turn = await recordGameTurn({
      userId: identity.userId,
      gameId: game.id,
      userContent: content,
      assistantContent: reply.content,
      assistantMeta: buildAssistantMeta(reply.assistantMessage, {
        sessionId: reply.sessionId,
        partCount: reply.parts.length,
      }),
      chargeAmount: TURN_COST,
      reason: `游戏回合扣费：${game.id}`,
    });

    return NextResponse.json({
      userMessage: turn.userMessage,
      assistantMessage: turn.assistantMessage,
      balance: turn.wallet.balance,
    });
  } catch (error) {
    console.error('[api/games/messages] 保存回合失败', error);
    if (error instanceof Error && error.message === '余额不足') {
      return NextResponse.json({ error: '余额不足' }, { status: 402 });
    }
    return NextResponse.json({ error: '保存回合失败' }, { status: 500 });
  }
}
