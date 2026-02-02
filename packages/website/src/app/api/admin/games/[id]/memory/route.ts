import { NextResponse } from 'next/server';
import { getGameById, getGameMemory, getCharacterByIdForUser } from '@/lib/db/repositories';
import { requireAdmin } from '@/app/api/admin/admin-utils';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { id: gameId } = await context.params;
  if (!gameId) {
    return NextResponse.json({ error: '缺少游戏编号' }, { status: 400 });
  }
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) {
    return adminContext;
  }
  try {
    const game = await getGameById(adminContext.db, gameId);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    const [memory, character] = await Promise.all([
      getGameMemory(adminContext.db, game.id),
      getCharacterByIdForUser(adminContext.db, game.characterId, game.userId),
    ]);
    return NextResponse.json({
      memory: memory ?? null,
      character: character ?? null,
    });
  } catch (error) {
    console.error('[api/admin/games/:id/memory] 记忆读取失败', error);
    const message = error instanceof Error ? error.message : '记忆读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
