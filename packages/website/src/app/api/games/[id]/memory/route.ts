import { NextResponse } from 'next/server';
import { getAuth } from '../../../../../lib/auth/auth';
import { getDatabase } from '../../../../../lib/db/db';
import { getCharacterByIdForUser, getGameByIdForUser, getGameMemory } from '../../../../../lib/db/repositories';
import { buildMemorySnapshot } from '../../../../../lib/game/memory';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id: gameId } = await context.params;
  if (!gameId) {
    return NextResponse.json({ error: '缺少游戏编号' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法读取记忆' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法读取记忆' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const game = await getGameByIdForUser(db, gameId, userId);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    const [character, memory] = await Promise.all([
      getCharacterByIdForUser(db, game.characterId, userId),
      getGameMemory(db, game.id),
    ]);
    if (!character) {
      return NextResponse.json({ error: '游戏数据不完整' }, { status: 404 });
    }
    return NextResponse.json({
      memory: memory ? buildMemorySnapshot(memory.state) : null,
      character,
      meta: memory
        ? {
            lastRoundIndex: memory.lastRoundIndex,
            lastProcessedAt: memory.lastProcessedAt,
            updatedAt: memory.updatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('[api/games/:id/memory] 记忆读取失败', error);
    const message = error instanceof Error ? error.message : '记忆读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
