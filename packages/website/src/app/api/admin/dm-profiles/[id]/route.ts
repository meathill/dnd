import { NextResponse } from 'next/server';
import { deleteDmProfile, getDmProfileWithRules, updateDmProfile } from '@/lib/db/repositories';
import { requireAdmin } from '@/app/api/admin/admin-utils';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

type UpdateProfilePayload = {
  name?: unknown;
  summary?: unknown;
  analysisGuide?: unknown;
  narrationGuide?: unknown;
  isDefault?: unknown;
};

function parseUpdatePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as UpdateProfilePayload;
  const result: {
    name?: string;
    summary?: string;
    analysisGuide?: string;
    narrationGuide?: string;
    isDefault?: boolean;
  } = {};
  if (typeof data.name === 'string') {
    const trimmed = data.name.trim();
    if (!trimmed) {
      return null;
    }
    result.name = trimmed;
  }
  if (typeof data.summary === 'string') {
    const trimmed = data.summary.trim();
    if (!trimmed) {
      return null;
    }
    result.summary = trimmed;
  }
  if (typeof data.analysisGuide === 'string') {
    result.analysisGuide = data.analysisGuide;
  }
  if (typeof data.narrationGuide === 'string') {
    result.narrationGuide = data.narrationGuide;
  }
  if (typeof data.isDefault === 'boolean') {
    result.isDefault = data.isDefault;
  }
  return result;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '缺少 DM 编号' }, { status: 400 });
  }
  const authContext = await requireAdmin(request);
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  try {
    const profile = await getDmProfileWithRules(authContext.db, id);
    if (!profile) {
      return NextResponse.json({ error: 'DM 风格不存在' }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 读取失败', error);
    const message = error instanceof Error ? error.message : '读取 DM 风格失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '缺少 DM 编号' }, { status: 400 });
  }
  const authContext = await requireAdmin(request);
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const payload = parseUpdatePayload(body);
  if (!payload) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }
  try {
    const updated = await updateDmProfile(authContext.db, id, payload);
    if (!updated) {
      return NextResponse.json({ error: 'DM 风格不存在' }, { status: 404 });
    }
    const profile = await getDmProfileWithRules(authContext.db, id);
    return NextResponse.json({ profile: profile ?? updated });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 更新失败', error);
    const message = error instanceof Error ? error.message : '更新 DM 风格失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '缺少 DM 编号' }, { status: 400 });
  }
  const authContext = await requireAdmin(request);
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  try {
    const success = await deleteDmProfile(authContext.db, id);
    if (!success) {
      return NextResponse.json({ error: 'DM 风格不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 删除失败', error);
    const message = error instanceof Error ? error.message : '删除 DM 风格失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
