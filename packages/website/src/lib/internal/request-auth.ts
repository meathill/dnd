import { NextResponse } from 'next/server';
import { getRequestSession } from '../auth/session';

export type RequestIdentity = {
  userId: string;
  balance: number;
};

export async function getRequestIdentity(): Promise<RequestIdentity | NextResponse> {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return {
    userId: session.userId,
    balance: session.balance,
  };
}
