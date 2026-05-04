import { NextResponse } from 'next/server';
import { getRequestSession } from '../auth/session';
import { getBearerToken, isInternalServiceTokenValid } from './service-token';

export type RequestIdentity =
  | {
      kind: 'user';
      userId: string;
      balance: number;
    }
  | {
      kind: 'internal';
      userId: string;
      balance: number | null;
    };

export async function getRequestIdentity(request: Request): Promise<RequestIdentity | NextResponse> {
  const session = await getRequestSession();
  if (session) {
    return {
      kind: 'user',
      userId: session.userId,
      balance: session.balance,
    };
  }

  const bearerToken = getBearerToken(request.headers.get('authorization'));
  if (!bearerToken || !isInternalServiceTokenValid(bearerToken)) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = request.headers.get('x-muir-user-id')?.trim();
  if (!userId) {
    return NextResponse.json({ error: '缺少用户上下文' }, { status: 400 });
  }

  const balanceHeader = request.headers.get('x-muir-balance')?.trim();
  const balance = balanceHeader ? Number(balanceHeader) : null;
  return {
    kind: 'internal',
    userId,
    balance: Number.isFinite(balance) ? balance : null,
  };
}
