import { NextResponse } from 'next/server';
import { requireRoot } from '@/app/api/admin/admin-utils';
import { createScript, getScriptById, listScripts } from '@/lib/db/repositories';
import { parseScriptDefinition } from '@/lib/game/script-parser';

type ScriptPayload = {
  id?: unknown;
  title?: unknown;
};

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  return slug;
}

function resolveScriptId(payload: ScriptPayload): string {
  const rawId = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (rawId) {
    return rawId;
  }
  const title = typeof payload.title === 'string' ? payload.title : '';
  const slug = slugify(title);
  if (slug) {
    return slug.startsWith('script-') ? slug : `script-${slug}`;
  }
  return `script-${crypto.randomUUID().slice(0, 8)}`;
}

export async function GET(request: Request) {
  const context = await requireRoot(request);
  if (context instanceof NextResponse) {
    return context;
  }
  try {
    const scripts = await listScripts(context.db);
    return NextResponse.json({ scripts });
  } catch (error) {
    console.error('[api/admin/scripts] 列表读取失败', error);
    const message = error instanceof Error ? error.message : '读取剧本失败';
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

  const payload = body as ScriptPayload;
  const scriptId = resolveScriptId(payload);
  const parsed = parseScriptDefinition(body, scriptId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const existing = await getScriptById(context.db, scriptId);
    if (existing) {
      return NextResponse.json({ error: '剧本编号已存在' }, { status: 409 });
    }
    const script = await createScript(context.db, parsed.value);
    return NextResponse.json({ script });
  } catch (error) {
    console.error('[api/admin/scripts] 创建失败', error);
    const message = error instanceof Error ? error.message : '创建剧本失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
