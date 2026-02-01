import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import { createGame, getCharacterByIdForUser, getScriptById, listGamesByUser } from '@/lib/db/repositories';
import { parseCreateGamePayload } from '@/lib/game/validators';

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法读取游戏记录' }, { status: 401 });
  }
  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法读取游戏记录' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const games = await listGamesByUser(db, userId);
    return NextResponse.json({ games });
  } catch (error) {
    console.error('[api/games] 游戏记录获取失败', error);
    const message = error instanceof Error ? error.message : '游戏记录获取失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const payload = parseCreateGamePayload(body);
  if (!payload) {
    return NextResponse.json({ error: '创建游戏参数不完整' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法创建游戏' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法创建游戏' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const [script, character] = await Promise.all([
      getScriptById(db, payload.scriptId),
      getCharacterByIdForUser(db, payload.characterId, userId),
    ]);
    if (!script || !character) {
      return NextResponse.json({ error: '脚本或人物卡不存在' }, { status: 404 });
    }
    if (character.scriptId !== payload.scriptId) {
      return NextResponse.json({ error: '人物卡不属于该剧本' }, { status: 400 });
    }

    const game = await createGame(db, userId, payload);
    return NextResponse.json({ game });
  } catch (error) {
    console.error('[api/games] 创建游戏失败', error);
    const message = error instanceof Error ? error.message : '创建游戏失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
