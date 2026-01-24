import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db/db';
import { createGame, getCharacterById, getScriptById } from '../../../lib/db/repositories';
import { parseCreateGamePayload } from '../../../lib/game/validators';

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

  try {
    const db = await getDatabase();
    const [script, character] = await Promise.all([
      getScriptById(db, payload.scriptId),
      getCharacterById(db, payload.characterId),
    ]);
    if (!script || !character) {
      return NextResponse.json({ error: '脚本或人物卡不存在' }, { status: 404 });
    }
    if (character.scriptId !== payload.scriptId) {
      return NextResponse.json({ error: '人物卡不属于该剧本' }, { status: 400 });
    }

    const game = await createGame(db, payload);
    return NextResponse.json({ game });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建游戏失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
