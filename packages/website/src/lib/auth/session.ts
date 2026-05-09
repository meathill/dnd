import { headers } from 'next/headers';
import { resolveAdminEmails } from '../config/runtime';
import { getUserById } from '../db/users-repo';
import { ensureWallet } from '../db/wallets-repo';
import type { SessionInfo } from '../game/types';
import { getAuth } from './auth';
import { isAdminEmail, resolveSessionRole } from './permission';

export async function getRequestSession(): Promise<SessionInfo | null> {
  const auth = await getAuth();
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession?.user) {
    return null;
  }
  const userId = authSession.user.id;
  const email = authSession.user.email ?? '';
  const [wallet, profile, adminEmails] = await Promise.all([
    ensureWallet(userId),
    getUserById(userId),
    resolveAdminEmails(),
  ]);
  return {
    userId,
    displayName: authSession.user.name ?? authSession.user.email ?? userId,
    email,
    balance: wallet.balance,
    role: resolveSessionRole(profile?.role),
    isAdmin: isAdminEmail(email, adminEmails),
  };
}
