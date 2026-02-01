import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db/db';
import { getScriptById } from '@/lib/db/repositories';

type RouteContext = {
  params: Promise<{ id?: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { id: scriptId } = await context.params;
  if (!scriptId) {
    return NextResponse.json({ error: '缺少剧本编号' }, { status: 400 });
  }
  try {
    const db = await getDatabase();
    const script = await getScriptById(db, scriptId);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }
    return NextResponse.json({ script });
  } catch (error) {
    const message = error instanceof Error ? error.message : '剧本读取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
