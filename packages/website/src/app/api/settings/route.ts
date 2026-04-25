import { NextResponse } from 'next/server';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import { listActiveAiModelOptions, upsertUserSettings } from '@/lib/db/repositories';
import type { AiProvider } from '@/lib/ai/ai-types';
import { isAllowedModel, normalizeModel } from '@/lib/ai/ai-models';
import type { UserSettings } from '@/lib/session/session-types';

function isAiProvider(value: string): value is AiProvider {
  return value === 'openai' || value === 'gemini';
}

type ParsedSettings = {
  provider: AiProvider;
  fastModel: string;
  generalModel: string;
  dmProfileId: string;
};

function parseSettingsPayload(payload: unknown): ParsedSettings | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as { provider?: unknown; fastModel?: unknown; generalModel?: unknown; dmProfileId?: unknown };
  if (typeof data.provider !== 'string' || !isAiProvider(data.provider)) {
    return null;
  }
  const fastModel = typeof data.fastModel === 'string' ? data.fastModel.trim() : '';
  const generalModel = typeof data.generalModel === 'string' ? data.generalModel.trim() : '';
  const dmProfileId = typeof data.dmProfileId === 'string' ? data.dmProfileId.trim() : '';
  return {
    provider: data.provider,
    fastModel,
    generalModel,
    dmProfileId,
  };
}

function buildAllowedModelChecker(provider: AiProvider, kind: 'fast' | 'general', extras: string[]) {
  return (modelId: string) => {
    if (!modelId) return true;
    if (isAllowedModel(provider, kind, modelId)) return true;
    return extras.includes(modelId);
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

    const extras = await listActiveAiModelOptions(db);
    const fastExtras = extras
      .filter((m) => m.provider === settings.provider && m.kind === 'fast')
      .map((m) => m.modelId);
    const generalExtras = extras
      .filter((m) => m.provider === settings.provider && m.kind === 'general')
      .map((m) => m.modelId);
    const isFastAllowed = buildAllowedModelChecker(settings.provider, 'fast', fastExtras);
    const isGeneralAllowed = buildAllowedModelChecker(settings.provider, 'general', generalExtras);

    if (!isFastAllowed(settings.fastModel) || !isGeneralAllowed(settings.generalModel)) {
      return NextResponse.json({ error: '所选模型不在允许列表内' }, { status: 400 });
    }

    const finalSettings: UserSettings = {
      provider: settings.provider,
      fastModel: settings.fastModel || normalizeModel(settings.provider, 'fast', ''),
      generalModel: settings.generalModel || normalizeModel(settings.provider, 'general', ''),
      dmProfileId: settings.dmProfileId || null,
    };
    const saved = await upsertUserSettings(db, userId, finalSettings);
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
