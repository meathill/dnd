import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db/db';
import { listScripts } from '../../../lib/db/repositories';

export async function GET() {
  try {
    const db = await getDatabase();
    const scripts = await listScripts(db);
    return NextResponse.json({ scripts });
  } catch (error) {
    const message = error instanceof Error ? error.message : '脚本列表获取失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
