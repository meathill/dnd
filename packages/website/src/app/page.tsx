import Link from 'next/link';
import { Card } from '@/components/card';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';
import { listModules } from '@/lib/db/repositories';

export default async function HomePage() {
  const [modules, session, adminEmails] = await Promise.all([listModules(), getRequestSession(), resolveAdminEmails()]);
  const showAuthoring = session ? canEdit({ email: session.email, role: session.role }, adminEmails) : false;
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">肉团长</p>
          <h1 className="text-4xl font-semibold text-zinc-950">选择一个模组，进入你的游戏</h1>
          <p className="max-w-2xl text-zinc-600">
            登录后可查看模组列表，选择人物卡，并直接在主站内进入统一游戏运行页。
          </p>
        </div>
        {showAuthoring ? (
          <Link
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            href="/modules/new"
          >
            创作新模组
          </Link>
        ) : null}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((moduleRecord) => (
          <Card className="space-y-4" key={moduleRecord.id}>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                <span>{moduleRecord.difficulty}</span>
                <span>·</span>
                <span>{moduleRecord.setting}</span>
              </div>
              <h2 className="text-2xl font-semibold text-zinc-950">{moduleRecord.title}</h2>
              <p className="text-sm leading-7 text-zinc-600">{moduleRecord.summary}</p>
            </div>
            <Link
              className="text-sm font-medium text-zinc-950 underline underline-offset-4"
              href={`/modules/${moduleRecord.id}`}
            >
              查看摘要并开始
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
