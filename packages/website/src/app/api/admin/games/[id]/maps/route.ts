import { NextResponse } from 'next/server';
import { listGameMemoryMaps, getGameById } from '../../../../../lib/db/repositories';
import { requireRoot } from '../../admin-utils';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

function parseLimit(request: Request): number {
  const url = new URL(request.url);
  const raw = url.searchParams.get('limit');
  if (!raw) {
    return 20;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return 20;
  }
  return Math.min(Math.max(Math.floor(value), 1), 50);
}

export async function GET(request: Request, context: RouteContext) {
  const { id: gameId } = await context.params;
  if (!gameId) {
    return NextResponse.json({ error: '缺少游戏编号' }, { status: 400 });
  }
  const adminContext = await requireRoot(request);
  if (adminContext instanceof NextResponse) {
    return adminContext;
  }
  try {
    const game = await getGameById(adminContext.db, gameId);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    const maps = await listGameMemoryMaps(adminContext.db, game.id, parseLimit(request));
    return NextResponse.json({ maps });
  } catch (error) {
    console.error('[api/admin/games/:id/maps] 地图读取失败', error);
    const message = error instanceof Error ? error.message : '地图读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
