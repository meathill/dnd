import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/admin-utils';
import { createAiModel, listAiModels } from '@/lib/db/repositories';
import type { AiModelInput } from '@/lib/ai/ai-types';

function parseInput(body: unknown): AiModelInput | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const provider = data.provider === 'gemini' ? 'gemini' : data.provider === 'openai' ? 'openai' : null;
  const kind = data.kind === 'general' ? 'general' : data.kind === 'fast' ? 'fast' : null;
  const modelId = typeof data.modelId === 'string' ? data.modelId.trim() : '';
  const label = typeof data.label === 'string' ? data.label.trim() : '';
  if (!provider || !kind || !modelId || !label) return null;
  return {
    provider,
    kind,
    modelId,
    label,
    description: typeof data.description === 'string' ? data.description.trim() : '',
    baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl.trim() : '',
    apiKey: typeof data.apiKey === 'string' ? data.apiKey.trim() : '',
    sortOrder: typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder) ? data.sortOrder : 0,
    isActive: typeof data.isActive === 'boolean' ? data.isActive : true,
  };
}

export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (context instanceof NextResponse) return context;
  try {
    const models = await listAiModels(context.db);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('[api/admin/ai-models] 列表读取失败', error);
    const message = error instanceof Error ? error.message : '读取 AI 模型失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await requireAdmin(request);
  if (context instanceof NextResponse) return context;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const input = parseInput(body);
  if (!input) {
    return NextResponse.json({ error: '参数不合法（provider / kind / modelId / label 必填）' }, { status: 400 });
  }
  try {
    const model = await createAiModel(context.db, input);
    return NextResponse.json({ model });
  } catch (error) {
    console.error('[api/admin/ai-models] 创建失败', error);
    const message = error instanceof Error ? error.message : 'AI 模型创建失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
