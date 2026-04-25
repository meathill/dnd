import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/admin-utils';
import { listActiveAiModelOptions } from '@/lib/db/repositories';

// 普通用户拉取「可选」模型列表用于设置面板。不返回任何凭据字段。
export async function GET(request: Request) {
  const context = await requireAdmin(request);
  if (context instanceof NextResponse) return context;
  try {
    const models = await listActiveAiModelOptions(context.db);
    return NextResponse.json({ models });
  } catch (error) {
    console.error('[api/ai-models] 列表读取失败', error);
    const message = error instanceof Error ? error.message : '读取 AI 模型失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
