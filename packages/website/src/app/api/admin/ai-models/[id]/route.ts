import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/admin-utils';
import { deleteAiModel, updateAiModel } from '@/lib/db/repositories';
import type { AiModelInput } from '@/lib/ai/ai-types';

type RouteContext = { params: Promise<{ id?: string }> };

async function resolveId(context: RouteContext): Promise<string> {
  const params = await context.params;
  return typeof params.id === 'string' ? params.id : '';
}

function parsePartialInput(body: unknown): Partial<AiModelInput> | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const result: Partial<AiModelInput> = {};
  if (data.provider === 'openai' || data.provider === 'gemini') result.provider = data.provider;
  if (data.kind === 'fast' || data.kind === 'general') result.kind = data.kind;
  if (typeof data.modelId === 'string') result.modelId = data.modelId.trim();
  if (typeof data.label === 'string') result.label = data.label.trim();
  if (typeof data.description === 'string') result.description = data.description.trim();
  if (typeof data.baseUrl === 'string') result.baseUrl = data.baseUrl.trim();
  if (typeof data.apiKey === 'string') result.apiKey = data.apiKey.trim();
  if (typeof data.sortOrder === 'number' && Number.isFinite(data.sortOrder)) result.sortOrder = data.sortOrder;
  if (typeof data.isActive === 'boolean') result.isActive = data.isActive;
  return result;
}

export async function PATCH(request: Request, context: RouteContext) {
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) return adminContext;
  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: '缺少模型编号' }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const input = parsePartialInput(body);
  if (!input) return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  try {
    const model = await updateAiModel(adminContext.db, id, input);
    if (!model) return NextResponse.json({ error: '模型不存在' }, { status: 404 });
    return NextResponse.json({ model });
  } catch (error) {
    console.error('[api/admin/ai-models] 更新失败', error);
    const message = error instanceof Error ? error.message : 'AI 模型更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) return adminContext;
  const id = await resolveId(context);
  if (!id) return NextResponse.json({ error: '缺少模型编号' }, { status: 400 });
  try {
    const ok = await deleteAiModel(adminContext.db, id);
    if (!ok) return NextResponse.json({ error: '模型不存在或删除失败' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/admin/ai-models] 删除失败', error);
    const message = error instanceof Error ? error.message : 'AI 模型删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
