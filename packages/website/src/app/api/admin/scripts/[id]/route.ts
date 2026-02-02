import { NextResponse } from 'next/server';
import { requireAdmin } from '@/app/api/admin/admin-utils';
import { deleteScript, getScriptById, updateScript } from '@/lib/db/repositories';
import { parseScriptDefinition } from '@/lib/game/script-parser';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

async function resolveScriptId(context: RouteContext): Promise<string> {
  const params = await context.params;
  return typeof params.id === 'string' ? params.id : '';
}

export async function GET(request: Request, context: RouteContext) {
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) {
    return adminContext;
  }
  const scriptId = await resolveScriptId(context);
  if (!scriptId) {
    return NextResponse.json({ error: '缺少剧本编号' }, { status: 400 });
  }
  try {
    const script = await getScriptById(adminContext.db, scriptId);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }
    return NextResponse.json({ script });
  } catch (error) {
    console.error('[api/admin/scripts] 读取失败', error);
    const message = error instanceof Error ? error.message : '读取剧本失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) {
    return adminContext;
  }
  const scriptId = await resolveScriptId(context);
  if (!scriptId) {
    return NextResponse.json({ error: '缺少剧本编号' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const parsed = parseScriptDefinition(body, scriptId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const script = await updateScript(adminContext.db, scriptId, parsed.value);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }
    return NextResponse.json({ script });
  } catch (error) {
    console.error('[api/admin/scripts] 更新失败', error);
    const message = error instanceof Error ? error.message : '更新剧本失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) {
    return adminContext;
  }
  const scriptId = await resolveScriptId(context);
  if (!scriptId) {
    return NextResponse.json({ error: '缺少剧本编号' }, { status: 400 });
  }
  try {
    const script = await getScriptById(adminContext.db, scriptId);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }
    const deleted = await deleteScript(adminContext.db, scriptId);
    if (!deleted) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/admin/scripts] 删除失败', error);
    const message = error instanceof Error ? error.message : '删除剧本失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
