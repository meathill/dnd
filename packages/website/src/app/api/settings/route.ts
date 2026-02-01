import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import { upsertUserSettings } from '@/lib/db/repositories';
import type { AiProvider } from '@/lib/ai/ai-types';
import { isAllowedModel, normalizeModel } from '@/lib/ai/ai-models';
import type { UserSettings } from '@/lib/session/session-types';

function isAiProvider(value: string): value is AiProvider {
  return value === 'openai' || value === 'gemini';
}

function parseSettingsPayload(payload: unknown): UserSettings | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as { provider?: unknown; fastModel?: unknown; generalModel?: unknown; dmProfileId?: unknown };
  if (typeof data.provider !== 'string' || !isAiProvider(data.provider)) {
    return null;
  }
  const fastModel = typeof data.fastModel === 'string' ? data.fastModel.trim() : '';
  const generalModel = typeof data.generalModel === 'string' ? data.generalModel.trim() : '';
  if (fastModel && !isAllowedModel(data.provider, 'fast', fastModel)) {
    return null;
  }
  if (generalModel && !isAllowedModel(data.provider, 'general', generalModel)) {
    return null;
  }
  const dmProfileId = typeof data.dmProfileId === 'string' ? data.dmProfileId.trim() : '';
  return {
    provider: data.provider,
    fastModel: normalizeModel(data.provider, 'fast', fastModel),
    generalModel: normalizeModel(data.provider, 'general', generalModel),
    dmProfileId: dmProfileId || null,
  };
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
