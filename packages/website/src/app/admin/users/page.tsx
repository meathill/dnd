import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { getRequestSession } from '@/lib/auth/session';
import { listAllUsers } from '@/lib/db/users-repo';
import { resolveAdminEmails } from '@/lib/config/runtime';
import type { UserRole } from '@/lib/game/types';
import { UserRoleControl } from './role-control';

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  admin: { label: 'admin', cls: 'bg-violet-100 text-violet-900 ring-violet-200' },
  editor: { label: 'editor', cls: 'bg-amber-100 text-amber-900 ring-amber-200' },
  user: { label: 'user', cls: 'bg-zinc-100 text-zinc-700 ring-zinc-200' },
};

export default async function AdminUsersPage() {
  const session = await getRequestSession();
  if (!session?.isAdmin) {
    redirect('/admin/module-drafts');
  }
  const [users, adminEmails] = await Promise.all([listAllUsers(), resolveAdminEmails()]);
  const adminSet = new Set(adminEmails.map((email) => email.toLowerCase()));

  return (
    <Card className="space-y-0 p-0">
      <div className="space-y-1 border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-950">用户与权限</h2>
        <p className="text-sm text-zinc-500">
          管理员名单由 <code className="rounded bg-zinc-100 px-1 text-xs">ADMIN_EMAILS</code> 环境变量决定； editor
          角色可在这里设置。
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
            <tr>
              <th className="px-6 py-3">用户</th>
              <th className="px-6 py-3">角色</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((entry) => {
              const isAdmin = adminSet.has((entry.email ?? '').toLowerCase());
              const effectiveRole: UserRole | 'admin' = isAdmin ? 'admin' : entry.role;
              const badge = ROLE_BADGE[effectiveRole] ?? ROLE_BADGE.user;
              return (
                <tr key={entry.id}>
                  <td className="px-6 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-zinc-950">{entry.name ?? '—'}</span>
                      <span className="text-xs text-zinc-500">{entry.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    {isAdmin ? (
                      <span className="text-xs text-zinc-500">admin 由环境变量管理</span>
                    ) : (
                      <UserRoleControl userId={entry.id} role={entry.role} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
