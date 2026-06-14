import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { getRequestSession } from '@/lib/auth/session';
import { listModuleDraftsForOwner } from '@/lib/db/module-drafts-repo';

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿中',
  published: '已发布',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', { hour12: false });
}

export default async function AdminModuleDraftsPage() {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login?next=/admin/module-drafts');
  }
  const drafts = await listModuleDraftsForOwner(session.userId);

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-950">模组草稿</h2>
          <p className="text-sm text-zinc-600">在这里追踪你正在创作的模组，点击进入对话编辑器。</p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
          href="/modules/new"
        >
          创作新模组
        </Link>
      </div>

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          还没有草稿。点击右上角「创作新模组」开始。
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200">
          {drafts.map((draft) => (
            <li key={draft.id} className="py-3">
              <Link
                className="block space-y-1 hover:bg-zinc-50 -mx-2 px-2 py-2 rounded-lg"
                href={`/modules/drafts/${draft.id}`}
              >
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  <span>{STATUS_LABEL[draft.status] ?? draft.status}</span>
                  <span>·</span>
                  <span>{draft.slug}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-base font-medium text-zinc-950">{draft.title || '（未命名）'}</h3>
                  <span className="text-xs text-zinc-500">{formatDateTime(draft.updatedAt)}</span>
                </div>
                {draft.summary ? <p className="line-clamp-2 text-sm text-zinc-600">{draft.summary}</p> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
