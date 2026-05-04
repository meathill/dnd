import { NextResponse } from 'next/server';
import { getGameByIdForUser, recordGameTurn } from '@/lib/db/repositories';
import { getRequestIdentity } from '@/lib/internal/request-auth';

const TURN_COST = 5;

type InternalTurnRouteProps = {
  params: Promise<{ id: string }>;
};

type RecordTurnRequest = {
  userContent?: string;
  assistantContent?: string;
  assistantMeta?: Record<string, unknown>;
  chargeAmount?: number;
  chargeReason?: string;
};

export async function POST(request: Request, { params }: InternalTurnRouteProps) {
  const identity = await getRequestIdentity(request);
  if (identity instanceof NextResponse) {
    return identity;
  }

  let body: RecordTurnRequest;
  try {
    body = (await request.json()) as RecordTurnRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }

  const userContent = body.userContent?.trim();
  const assistantContent = body.assistantContent?.trim();
  if (!userContent || !assistantContent) {
    return NextResponse.json({ error: '缺少回合消息内容' }, { status: 400 });
  }

  const chargeAmount = body.chargeAmount ?? TURN_COST;
  if (!Number.isInteger(chargeAmount) || chargeAmount < 0) {
    return NextResponse.json({ error: '扣费额度无效' }, { status: 400 });
  }

  const { id } = await params;
  const game = await getGameByIdForUser(id, identity.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }

  try {
    const turn = await recordGameTurn({
      userId: identity.userId,
      gameId: game.id,
      userContent,
      assistantContent,
      userMeta: {
        runtime: 'play',
      },
      assistantMeta: {
        runtime: 'play',
        ...(body.assistantMeta ?? {}),
      },
      chargeAmount,
      reason: body.chargeReason?.trim() || `游戏回合扣费：${game.id}`,
    });

    return NextResponse.json({
      userMessage: turn.userMessage,
      assistantMessage: turn.assistantMessage,
      balance: turn.wallet.balance,
    });
  } catch (error) {
    console.error('[api/internal/games/turn] 保存回合失败', error);
    if (error instanceof Error && error.message === '余额不足') {
      return NextResponse.json({ error: '余额不足' }, { status: 402 });
    }
    return NextResponse.json({ error: '保存回合失败' }, { status: 500 });
  }
}
