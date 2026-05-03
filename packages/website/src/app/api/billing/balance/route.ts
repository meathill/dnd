import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({ balance: session.balance });
}
