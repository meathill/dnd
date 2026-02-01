import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import {
  deleteGame,
  getCharacterByIdForUser,
  getGameByIdForUser,
  getGameMemory,
  getScriptById,
  listGameMessages,
} from '@/lib/db/repositories';
import { buildMemorySnapshot } from '@/lib/game/memory';

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
    return NextResponse.json({ error: '未登录无法读取游戏' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法读取游戏' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const game = await getGameByIdForUser(db, gameId, userId);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    const [script, character, messages, memory] = await Promise.all([
      getScriptById(db, game.scriptId),
      getCharacterByIdForUser(db, game.characterId, userId),
      listGameMessages(db, game.id),
      getGameMemory(db, game.id),
    ]);
    if (!script || !character) {
      return NextResponse.json({ error: '游戏数据不完整' }, { status: 404 });
    }
    return NextResponse.json({
      game,
      script,
      character,
      messages,
      memory: memory ? buildMemorySnapshot(memory.state) : null,
    });
  } catch (error) {
    console.error('[api/games/:id] 游戏读取失败', error);
    const message = error instanceof Error ? error.message : '游戏读取失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: gameId } = await context.params;
  if (!gameId) {
    return NextResponse.json({ error: '缺少游戏编号' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法删除游戏' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法删除游戏' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const game = await getGameByIdForUser(db, gameId, userId);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    await deleteGame(db, gameId, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/games/:id] 游戏删除失败', error);
    const message = error instanceof Error ? error.message : '游戏删除失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
