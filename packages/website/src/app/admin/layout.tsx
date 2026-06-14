import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login?next=/admin');
  }
  const adminEmails = await resolveAdminEmails();
  if (!canEdit({ email: session.email, role: session.role }, adminEmails)) {
    redirect('/');
  }
  const heading = session.isAdmin ? '后台管理' : '创作中心';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">{session.isAdmin ? 'Admin' : 'Editor'}</p>
        <h1 className="text-3xl font-semibold text-zinc-950">{heading}</h1>
      </div>
      <nav className="flex gap-4 border-b border-zinc-200 pb-3 text-sm">
        {session.isAdmin ? (
          <Link className="text-zinc-700 hover:text-zinc-950" href="/admin">
            概览
          </Link>
        ) : null}
        <Link className="text-zinc-700 hover:text-zinc-950" href="/admin/module-drafts">
          模组草稿
        </Link>
        {session.isAdmin ? (
          <Link className="text-zinc-700 hover:text-zinc-950" href="/admin/users">
            用户与权限
          </Link>
        ) : null}
      </nav>
      <div>{children}</div>
    </div>
  );
}
