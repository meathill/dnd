import { NextResponse } from 'next/server';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import { upsertUserSettings } from '../../../lib/db/repositories';
import type { AiProvider } from '../../../lib/ai/ai-types';
import type { UserSettings } from '../../../lib/session/session-types';

function isAiProvider(value: string): value is AiProvider {
  return value === 'openai' || value === 'gemini';
}

function parseSettingsPayload(payload: unknown): UserSettings | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as { provider?: unknown; model?: unknown };
  if (typeof data.provider !== 'string' || !isAiProvider(data.provider)) {
    return null;
  }
  const model = typeof data.model === 'string' ? data.model.trim() : '';
  return { provider: data.provider, model };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const settings = parseSettingsPayload(body);
  if (!settings) {
    return NextResponse.json({ error: '设置参数不合法' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法保存设置' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法保存设置' }, { status: 401 });
    }
    const userId = authSession.user.id;
    const db = await getDatabase();
    const saved = await upsertUserSettings(db, userId, settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    console.error('[api/settings] 保存设置失败', error);
    const message = error instanceof Error ? error.message : '保存设置失败';
    const payload: { error: string; stack?: string } = { error: message };
    if (process.env.NODE_ENV !== 'production' && error instanceof Error && error.stack) {
      payload.stack = error.stack;
    }
    return NextResponse.json(payload, { status: 500 });
  }
}
