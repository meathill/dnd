import { NextResponse } from 'next/server';
import { getAuth } from '../../../lib/auth/auth';
import { isRootUser } from '../../../lib/auth/root';
import { getDatabase } from '../../../lib/db/db';

export type AdminContext = {
  db: D1Database;
  userId: string;
};

export async function requireRoot(request: Request): Promise<AdminContext | NextResponse> {
  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法访问全局配置' }, { status: 401 });
  }
  const auth = await getAuth();
  const authSession = await auth.api.getSession({ headers: request.headers });
  if (!authSession?.user) {
    return NextResponse.json({ error: '未登录无法访问全局配置' }, { status: 401 });
  }
  const userId = authSession.user.id;
  const rootAllowed = await isRootUser(authSession.user);
  if (!rootAllowed) {
    return NextResponse.json({ error: '需要 root 权限' }, { status: 403 });
  }
  const db = await getDatabase();
  return { db, userId };
}
