import { NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/db/db';
import { listDmProfiles } from '../../../lib/db/repositories';

export async function GET() {
  try {
    const db = await getDatabase();
    const profiles = await listDmProfiles(db);
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error('[api/dm-profiles] 获取 DM 风格失败', error);
    const message = error instanceof Error ? error.message : '获取 DM 风格失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
