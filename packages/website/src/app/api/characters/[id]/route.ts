import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import {
  deleteCharacter,
  getCharacterByIdForUser,
  getGameByCharacterId,
  getScriptById,
  updateCharacter,
} from '@/lib/db/repositories';
import { parseCharacterPayload, validateCharacterAgainstScript } from '@/lib/game/validators';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id: characterId } = await context.params;
  if (!characterId) {
    return NextResponse.json({ error: '缺少人物卡编号' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const payload = parseCharacterPayload(body);
  if (!payload) {
    return NextResponse.json({ error: '人物卡数据不完整' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法更新人物卡' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法更新人物卡' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const existing = await getCharacterByIdForUser(db, characterId, userId);
    if (!existing) {
      return NextResponse.json({ error: '人物卡不存在' }, { status: 404 });
    }
    if (existing.scriptId !== payload.scriptId) {
      return NextResponse.json({ error: '人物卡不能更换剧本' }, { status: 400 });
    }
    const script = await getScriptById(db, payload.scriptId);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }
    const fieldErrors = validateCharacterAgainstScript(payload, script);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: '人物卡字段不合法', fieldErrors }, { status: 400 });
    }
    const character = await updateCharacter(db, characterId, userId, payload);
    if (!character) {
      return NextResponse.json({ error: '人物卡不存在' }, { status: 404 });
    }
    return NextResponse.json({ character });
  } catch (error) {
    console.error('[api/characters/:id] 人物卡更新失败', error);
    const message = error instanceof Error ? error.message : '人物卡更新失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id: characterId } = await context.params;
  if (!characterId) {
    return NextResponse.json({ error: '缺少人物卡编号' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法删除人物卡' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法删除人物卡' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const existing = await getCharacterByIdForUser(db, characterId, userId);
    if (!existing) {
      return NextResponse.json({ error: '人物卡不存在' }, { status: 404 });
    }
    const linkedGame = await getGameByCharacterId(db, characterId);
    if (linkedGame) {
      return NextResponse.json({ error: '人物卡已有游戏记录，无法删除' }, { status: 400 });
    }
    await deleteCharacter(db, characterId, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/characters/:id] 人物卡删除失败', error);
    const message = error instanceof Error ? error.message : '人物卡删除失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
