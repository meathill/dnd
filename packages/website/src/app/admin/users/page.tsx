import { Card } from '@/components/card';
import { listAllUsers } from '@/lib/db/users-repo';
import { UserRoleControl } from './role-control';

export default async function AdminUsersPage() {
  const users = await listAllUsers();
  return (
    <Card className="space-y-4 p-0">
      <div className="border-b border-zinc-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-zinc-950">用户与权限</h2>
        <p className="mt-1 text-sm text-zinc-600">将合作者标记为 editor 后，他们可以创作模组。</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.18em] text-zinc-500">
            <tr>
              <th className="px-6 py-3">邮箱</th>
              <th className="px-6 py-3">名称</th>
              <th className="px-6 py-3">角色</th>
              <th className="px-6 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((entry) => (
              <tr key={entry.id}>
                <td className="px-6 py-3 text-zinc-900">{entry.email}</td>
                <td className="px-6 py-3 text-zinc-700">{entry.name ?? '—'}</td>
                <td className="px-6 py-3 text-zinc-700">{entry.role}</td>
                <td className="px-6 py-3 text-right">
                  <UserRoleControl userId={entry.id} role={entry.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
