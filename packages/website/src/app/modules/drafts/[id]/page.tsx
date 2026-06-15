import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';
import { getModuleDraftById, listModuleDraftMessages } from '@/lib/db/module-drafts-repo';
import { DraftChatPanel } from './draft-chat-panel';
import { DraftPublishButton } from './publish-button';

type Props = {
  params: Promise<{ id: string }>;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft: { label: '草稿中', cls: 'bg-amber-100 text-amber-900 ring-amber-200' },
  published: { label: '已发布', cls: 'bg-emerald-100 text-emerald-900 ring-emerald-200' },
};

export default async function ModuleDraftPage({ params }: Props) {
  const { id } = await params;
  const session = await getRequestSession();
  if (!session) {
    redirect(`/login?next=/modules/drafts/${id}`);
  }
  const adminEmails = await resolveAdminEmails();
  if (!canEdit({ email: session.email, role: session.role }, adminEmails)) {
    redirect('/');
  }
  const draft = await getModuleDraftById(id);
  if (!draft) {
    notFound();
  }
  if (draft.ownerUserId !== session.userId && !session.isAdmin) {
    redirect('/');
  }

  const messages = await listModuleDraftMessages(id);
  const dataSummary = summarizeData(draft.data);
  const badge = STATUS_BADGE[draft.status] ?? STATUS_BADGE.draft;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-zinc-500" aria-label="面包屑">
        <Link className="hover:text-zinc-900" href="/admin/module-drafts">
          创作中心
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-700">{draft.title || '（未命名）'}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badge.cls}`}
            >
              {badge.label}
            </span>
            <span className="text-xs text-zinc-500">slug: {draft.slug}</span>
          </div>
          <h1 className="text-3xl font-semibold text-zinc-950">{draft.title || '（未命名）'}</h1>
        </div>
        <DraftPublishButton draftId={draft.id} disabled={draft.status === 'published'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-zinc-950">创作会话</h2>
            <span className="text-xs text-zinc-500">{messages.length} 条消息</span>
          </div>
          <DraftChatPanel draftId={draft.id} initialMessages={messages} />
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-950">Meta</h2>
            <dl className="space-y-2 text-sm">
              <Row label="摘要" value={draft.summary || '—'} />
              <Row label="设定" value={draft.setting || '—'} />
              <Row label="难度" value={draft.difficulty} />
            </dl>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-950">数据概览</h2>
            <ul className="space-y-1 text-sm">
              {dataSummary.map((item) => (
                <li className="flex justify-between gap-4" key={item.key}>
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="font-medium text-zinc-900">{item.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right text-zinc-900">{value}</dd>
    </div>
  );
}

type SummaryItem = { key: string; label: string; value: string };

function summarizeData(data: Record<string, unknown>): SummaryItem[] {
  function lengthOf(key: string): number {
    const value = data[key];
    return Array.isArray(value) ? value.length : 0;
  }
  const background = (data.background as Record<string, unknown> | undefined) ?? {};
  return [
    { key: 'background', label: '背景概要', value: typeof background.overview === 'string' ? '已填' : '空' },
    { key: 'npcProfiles', label: '关键 NPC', value: `${lengthOf('npcProfiles')} 个` },
    { key: 'scenes', label: '场景', value: `${lengthOf('scenes')} 个` },
    { key: 'options', label: '可选分支', value: `${lengthOf('options')} 项` },
  ];
}
