import Link from 'next/link';
import { Card } from '@/components/card';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';
import { listModuleDraftsForOwner } from '@/lib/db/module-drafts-repo';
import { listModules } from '@/lib/db/modules-repo';

export default async function HomePage() {
  const [modules, session, adminEmails] = await Promise.all([listModules(), getRequestSession(), resolveAdminEmails()]);
  const isEditor = session ? canEdit({ email: session.email, role: session.role }, adminEmails) : false;
  const drafts = isEditor && session ? await listModuleDraftsForOwner(session.userId) : [];

  if (!session) {
    return <GuestHero />;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">欢迎回来，{session.displayName}</p>
        <h1 className="text-3xl font-semibold text-zinc-950">选一个模组开始今晚的故事</h1>
      </header>

      {isEditor ? <AuthoringPanel draftCount={drafts.length} /> : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-zinc-950">模组库</h2>
          <span className="text-xs text-zinc-500">共 {modules.length} 个</span>
        </div>
        {modules.length === 0 ? (
          <EmptyModules isEditor={isEditor} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <ModuleCard
                key={module.id}
                difficulty={module.difficulty}
                href={`/modules/${module.id}`}
                setting={module.setting}
                summary={module.summary}
                title={module.title}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GuestHero() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 py-12 text-center">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">肉团长 · COC 跑团</p>
        <h1 className="text-4xl font-semibold text-zinc-950 sm:text-5xl">挑一个模组，跟 AI 一起跑团</h1>
        <p className="mx-auto max-w-xl text-zinc-600">
          登录后即可选择人物卡、进入统一游戏运行页；编辑者还可以用对话方式创作新模组。
        </p>
      </div>
      <div className="flex items-center justify-center gap-3">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
          href="/login"
        >
          登录 / 注册
        </Link>
      </div>
    </div>
  );
}

function AuthoringPanel({ draftCount }: { draftCount: number }) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-900/80">创作中心</p>
          <h2 className="text-lg font-semibold text-amber-950">
            {draftCount > 0 ? `你有 ${draftCount} 个进行中的草稿` : '还没有创作中的草稿'}
          </h2>
          <p className="text-sm text-amber-900/80">用对话和 skill 协作，把一段灵感快速整理成可玩的模组。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-sm font-medium text-amber-900 hover:bg-amber-100"
            href="/admin/module-drafts"
          >
            查看草稿
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            href="/modules/new"
          >
            创作新模组
          </Link>
        </div>
      </div>
    </section>
  );
}

function ModuleCard({
  href,
  title,
  summary,
  setting,
  difficulty,
}: {
  href: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
}) {
  return (
    <Link className="group block" href={href}>
      <Card className="h-full space-y-4 transition group-hover:shadow-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
            <span>{difficulty}</span>
            <span>·</span>
            <span>{setting}</span>
          </div>
          <h3 className="text-xl font-semibold text-zinc-950">{title}</h3>
          <p className="line-clamp-3 text-sm leading-7 text-zinc-600">{summary}</p>
        </div>
        <span className="text-sm font-medium text-zinc-950 underline-offset-4 group-hover:underline">
          查看摘要并开始 →
        </span>
      </Card>
    </Link>
  );
}

function EmptyModules({ isEditor }: { isEditor: boolean }) {
  return (
    <Card className="text-center text-sm text-zinc-500">
      <p>暂时还没有可玩的模组。</p>
      {isEditor ? (
        <p className="mt-2">
          <Link className="font-medium text-zinc-950 underline" href="/modules/new">
            创作第一个模组
          </Link>
        </p>
      ) : null}
    </Card>
  );
}
