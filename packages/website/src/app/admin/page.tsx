import { Card } from '@/components/card';
import { listAllUsers } from '@/lib/db/repositories';

export default async function AdminOverviewPage() {
  const users = await listAllUsers();
  const editorCount = users.filter((entry) => entry.role === 'editor').length;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <p className="text-sm text-zinc-500">注册用户</p>
        <p className="mt-2 text-3xl font-semibold text-zinc-950">{users.length}</p>
      </Card>
      <Card>
        <p className="text-sm text-zinc-500">编辑（editor）</p>
        <p className="mt-2 text-3xl font-semibold text-zinc-950">{editorCount}</p>
      </Card>
      <Card>
        <p className="text-sm text-zinc-500">说明</p>
        <p className="mt-2 text-sm leading-6 text-zinc-700">
          管理员通过 <code className="rounded bg-zinc-100 px-1">ADMIN_EMAILS</code>
          环境变量授权；从「用户与权限」可把任意用户标记为 editor。
        </p>
      </Card>
    </div>
  );
}
