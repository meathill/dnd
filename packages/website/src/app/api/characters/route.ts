import { NextResponse } from 'next/server';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import { createCharacter, getScriptById } from '../../../lib/db/repositories';
import { parseCharacterPayload, validateCharacterAgainstScript } from '../../../lib/game/validators';

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
    const message = error instanceof Error ? error.message : '人物卡保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
