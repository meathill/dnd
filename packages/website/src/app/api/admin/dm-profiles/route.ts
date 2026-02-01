import { NextResponse } from 'next/server';
import { createDmProfile, listDmProfiles } from '@/lib/db/repositories';
import { requireRoot } from '@/app/api/admin/admin-utils';

type CreateProfilePayload = {
  name?: unknown;
  summary?: unknown;
  analysisGuide?: unknown;
  narrationGuide?: unknown;
  isDefault?: unknown;
};

function parseCreatePayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const data = payload as CreateProfilePayload;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  if (!name || !summary) {
    return null;
  }
  const analysisGuide = typeof data.analysisGuide === 'string' ? data.analysisGuide.trim() : '';
  const narrationGuide = typeof data.narrationGuide === 'string' ? data.narrationGuide.trim() : '';
  const isDefault = typeof data.isDefault === 'boolean' ? data.isDefault : false;
  return {
    name,
    summary,
    analysisGuide,
    narrationGuide,
    isDefault,
  };
}

export async function GET(request: Request) {
  const context = await requireRoot(request);
  if (context instanceof NextResponse) {
    return context;
  }
  try {
    const profiles = await listDmProfiles(context.db);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 列表读取失败', error);
    const message = error instanceof Error ? error.message : '读取 DM 风格失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const context = await requireRoot(request);
  if (context instanceof NextResponse) {
    return context;
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const payload = parseCreatePayload(body);
  if (!payload) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 });
  }
  try {
    const profile = await createDmProfile(context.db, payload);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('[api/admin/dm-profiles] 创建失败', error);
    const message = error instanceof Error ? error.message : '创建 DM 风格失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
