import { NextResponse } from 'next/server';
import { deleteDmProfileRule, updateDmProfileRule } from '../../../../../../../lib/db/repositories';
import type { DmGuidePhase } from '../../../../../../../lib/game/types';
import { requireRoot } from '../../../../admin-utils';

type RouteContext = {
  params: Promise<{ id?: string; ruleId?: string }>;
};

type UpdateRulePayload = {
  phase?: unknown;
  category?: unknown;
  title?: unknown;
  content?: unknown;
  order?: unknown;
  isEnabled?: unknown;
};

function isPhase(value: string): value is DmGuidePhase {
  return value === 'analysis' || value === 'narration';
}

function parseUpdateRulePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as UpdateRulePayload;
  const result: {
    phase?: DmGuidePhase;
    category?: string;
    title?: string;
    content?: string;
    order?: number;
    isEnabled?: boolean;
  } = {};
  if (typeof data.phase === 'string' && isPhase(data.phase)) {
    result.phase = data.phase;
  }
  if (typeof data.category === 'string') {
    result.category = data.category.trim();
  }
  if (typeof data.title === 'string') {
    result.title = data.title.trim();
  }
  if (typeof data.content === 'string') {
    result.content = data.content.trim();
  }
  if (typeof data.order === 'number' && Number.isFinite(data.order)) {
    result.order = data.order;
  }
  if (typeof data.isEnabled === 'boolean') {
    result.isEnabled = data.isEnabled;
  }
  return result;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { ruleId } = await context.params;
  if (!ruleId) {
    return NextResponse.json({ error: '缺少规则编号' }, { status: 400 });
  }
  const authContext = await requireRoot(request);
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const payload = parseUpdateRulePayload(body);
  if (!payload) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }
  try {
    const rule = await updateDmProfileRule(authContext.db, ruleId, payload);
    if (!rule) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 });
    }
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 规则更新失败', error);
    const message = error instanceof Error ? error.message : '更新 DM 规则失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { ruleId } = await context.params;
  if (!ruleId) {
    return NextResponse.json({ error: '缺少规则编号' }, { status: 400 });
  }
  const authContext = await requireRoot(request);
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  try {
    const success = await deleteDmProfileRule(authContext.db, ruleId);
    if (!success) {
      return NextResponse.json({ error: '规则不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 规则删除失败', error);
    const message = error instanceof Error ? error.message : '删除 DM 规则失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
