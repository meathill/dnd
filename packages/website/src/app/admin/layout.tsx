import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getRequestSession } from '@/lib/auth/session';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login?next=/admin');
  }
  if (!session.isAdmin) {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Admin</p>
        <h1 className="text-3xl font-semibold text-zinc-950">后台管理</h1>
      </div>
      <nav className="flex gap-4 border-b border-zinc-200 pb-3 text-sm">
        <Link className="text-zinc-700 hover:text-zinc-950" href="/admin">
          概览
        </Link>
        <Link className="text-zinc-700 hover:text-zinc-950" href="/admin/users">
          用户与权限
        </Link>
      </nav>
      <div>{children}</div>
    </div>
  );
}
