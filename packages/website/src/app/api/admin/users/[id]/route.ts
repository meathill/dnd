import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { getUserById, updateUserRole } from '@/lib/db/repositories';
import type { UserRole } from '@/lib/game/types';

type PatchRequest = {
  role?: string;
};

function normalizeRole(value: string | undefined): UserRole | null {
  if (value === 'editor' || value === 'user') {
    return value;
  }
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (!session.isAdmin) {
    return NextResponse.json({ error: '无权访问' }, { status: 403 });
  }

  let body: PatchRequest;
  try {
    body = (await request.json()) as PatchRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }

  const role = normalizeRole(body.role);
  if (!role) {
    return NextResponse.json({ error: '不支持的 role 值' }, { status: 400 });
  }

  const { id } = await context.params;
  const target = await getUserById(id);
  if (!target) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  const updated = await updateUserRole(id, role);
  return NextResponse.json({ user: updated });
}
