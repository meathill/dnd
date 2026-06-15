import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { getRequestSession } from '@/lib/auth/session';
import { listModuleDraftsForOwner } from '@/lib/db/module-drafts-repo';
import { listModules } from '@/lib/db/modules-repo';
import { listAllUsers } from '@/lib/db/users-repo';

export default async function AdminOverviewPage() {
  const session = await getRequestSession();
  if (!session?.isAdmin) {
    redirect('/admin/module-drafts');
  }
  const [users, modules, drafts] = await Promise.all([
    listAllUsers(),
    listModules(),
    listModuleDraftsForOwner(session.userId),
  ]);
  const editorCount = users.filter((entry) => entry.role === 'editor').length;
  const draftInProgress = drafts.filter((draft) => draft.status === 'draft').length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label="注册用户" value={users.length} />
        <Stat label="编辑（editor）" value={editorCount} hint={`/ ${users.length} 人`} />
        <Stat label="已发布模组" value={modules.length} />
        <Stat label="我的草稿" value={draftInProgress} hint="进行中" />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-950">快速入口</h2>
          <ul className="space-y-2 text-sm">
            <QuickLink href="/admin/module-drafts" title="模组草稿" hint="查看与编辑自己的草稿" />
            <QuickLink href="/admin/users" title="用户与权限" hint="把合作者标记为 editor" />
            <QuickLink href="/modules/new" title="创作新模组" hint="进入对话式 authoring" />
          </ul>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-950">说明</h2>
          <p className="text-sm leading-6 text-zinc-700">
            管理员通过 <code className="rounded bg-zinc-100 px-1 text-xs">ADMIN_EMAILS</code> 环境变量授权；
            从「用户与权限」可把任意用户标记为 editor，让他们可以创作模组。
          </p>
          <p className="text-xs text-zinc-500">未发布的草稿不计入「已发布模组」；管理员只能看到自己创建的草稿。</p>
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-zinc-950">{value}</span>
        {hint ? <span className="text-xs text-zinc-500">{hint}</span> : null}
      </p>
    </Card>
  );
}

function QuickLink({ href, title, hint }: { href: string; title: string; hint: string }) {
  return (
    <li>
      <Link className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-zinc-50" href={href}>
        <span>
          <span className="block font-medium text-zinc-950">{title}</span>
          <span className="block text-xs text-zinc-500">{hint}</span>
        </span>
        <span className="text-zinc-400" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  );
}
