import { NextResponse } from 'next/server';
import { createDmProfileRule, listDmProfileRules } from '../../../../../../lib/db/repositories';
import type { DmGuidePhase } from '../../../../../../lib/game/types';
import { requireRoot } from '../../../admin-utils';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

type CreateRulePayload = {
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

function parseCreateRulePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as CreateRulePayload;
  const phase = typeof data.phase === 'string' && isPhase(data.phase) ? data.phase : null;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  if (!phase || !title || !content) {
    return null;
  }
  const category = typeof data.category === 'string' ? data.category.trim() : '';
  const order = typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : 0;
  const isEnabled = typeof data.isEnabled === 'boolean' ? data.isEnabled : true;
  return {
    phase,
    title,
    content,
    category,
    order,
    isEnabled,
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '缺少 DM 编号' }, { status: 400 });
  }
  const authContext = await requireRoot(request);
  if (authContext instanceof NextResponse) {
    return authContext;
  }
  try {
    const rules = await listDmProfileRules(authContext.db, id);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 规则读取失败', error);
    const message = error instanceof Error ? error.message : '读取 DM 规则失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: '缺少 DM 编号' }, { status: 400 });
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
  const payload = parseCreateRulePayload(body);
  if (!payload) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }
  try {
    const rule = await createDmProfileRule(authContext.db, {
      dmProfileId: id,
      ...payload,
    });
    return NextResponse.json({ rule });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 规则创建失败', error);
    const message = error instanceof Error ? error.message : '创建 DM 规则失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
