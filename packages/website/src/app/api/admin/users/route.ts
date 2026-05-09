import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { listAllUsers } from '@/lib/db/users-repo';

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 });
  }
  const users = await listAllUsers();
  return NextResponse.json({ users });
}
