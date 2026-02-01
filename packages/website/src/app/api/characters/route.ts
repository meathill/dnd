import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import { createCharacter, getScriptById, listCharactersByUserAndScript } from '@/lib/db/repositories';
import { parseCharacterPayload, validateCharacterAgainstScript } from '@/lib/game/validators';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scriptId = url.searchParams.get('scriptId')?.trim();
  if (!scriptId) {
    return NextResponse.json({ error: '缺少剧本编号' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法读取人物卡' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法读取人物卡' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const characters = await listCharactersByUserAndScript(db, userId, scriptId);
    return NextResponse.json({ characters });
  } catch (error) {
    console.error('[api/characters] 人物卡读取失败', error);
    const message = error instanceof Error ? error.message : '人物卡读取失败';
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

  const payload = parseCharacterPayload(body);
  if (!payload) {
    return NextResponse.json({ error: '人物卡数据不完整' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法创建人物卡' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法创建人物卡' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const script = await getScriptById(db, payload.scriptId);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }
    const fieldErrors = validateCharacterAgainstScript(payload, script);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: '人物卡字段不合法', fieldErrors }, { status: 400 });
    }
    const character = await createCharacter(db, userId, payload);
    return NextResponse.json({ character });
  } catch (error) {
    console.error('[api/characters] 人物卡保存失败', error);
    const message = error instanceof Error ? error.message : '人物卡保存失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
