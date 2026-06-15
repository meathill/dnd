import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';
import { ModuleDraftForm } from './form';

export default async function NewModulePage() {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login?next=/modules/new');
  }
  const adminEmails = await resolveAdminEmails();
  if (!canEdit({ email: session.email, role: session.role }, adminEmails)) {
    redirect('/');
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500" aria-label="面包屑">
        <Link className="hover:text-zinc-900" href="/admin/module-drafts">
          创作中心
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-700">新建模组</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-950">创作新模组</h1>
        <p className="max-w-2xl text-zinc-600">
          先把基础 Meta 填好，下一步会自动创建会话，进入对话与「创作模组」skill 协作完善细节。
        </p>
      </div>

      <Card>
        <ModuleDraftForm />
      </Card>
    </div>
  );
}
