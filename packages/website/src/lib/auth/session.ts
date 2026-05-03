import { headers } from 'next/headers';
import { getAuth } from './auth';
import { ensureWallet } from '../db/repositories';
import type { SessionInfo } from '../game/types';

export async function getRequestSession(): Promise<SessionInfo | null> {
  const auth = await getAuth();
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession?.user) {
    return null;
  }
  const wallet = await ensureWallet(authSession.user.id);
  return {
    userId: authSession.user.id,
    displayName: authSession.user.name ?? authSession.user.email ?? authSession.user.id,
    email: authSession.user.email ?? '',
    balance: wallet.balance,
  };
}
