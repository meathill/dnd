import { NextResponse } from 'next/server';
import { getAuth } from '../../../../../lib/auth/auth';
import { getDatabase } from '../../../../../lib/db/db';
import { getGameByIdForUser, listGameMemoryMaps } from '../../../../../lib/db/repositories';

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

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法读取地图' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法读取地图' }, { status: 401 });
    }
    const db = await getDatabase();
    const game = await getGameByIdForUser(db, gameId, authSession.user.id);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    const maps = await listGameMemoryMaps(db, game.id, parseLimit(request));
    return NextResponse.json({ maps });
  } catch (error) {
    console.error('[api/games/:id/maps] 地图读取失败', error);
    const message = error instanceof Error ? error.message : '地图读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
