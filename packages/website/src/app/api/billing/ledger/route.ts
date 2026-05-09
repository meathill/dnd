import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { listBillingLedger } from '@/lib/db/billing-repo';

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const ledger = await listBillingLedger(session.userId);
  return NextResponse.json({ ledger });
}
