import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db/db';
import { upsertUserSettings } from '../../../lib/db/repositories';
import type { AiProvider } from '../../../lib/ai/ai-types';
import type { UserSettings } from '../../../lib/session/session-types';

function getUserId(request: Request): string | null {
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId && headerUserId.trim()) {
    return headerUserId.trim();
  }
  const cookie = request.headers.get('cookie') ?? '';
  const parts = cookie.split(';').map((item) => item.trim());
  const userEntry = parts.find((item) => item.startsWith('user_id='));
  if (!userEntry) {
    return null;
  }
  const value = userEntry.split('=')[1];
  return value ? decodeURIComponent(value) : null;
}

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
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: '未登录无法保存设置' }, { status: 401 });
  }

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

  try {
    const db = await getDatabase();
    const saved = await upsertUserSettings(db, userId, settings);
    return NextResponse.json({ settings: saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存设置失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
