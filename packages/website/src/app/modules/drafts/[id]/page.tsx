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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">模组草稿 · {draft.status}</p>
          <h1 className="text-3xl font-semibold text-zinc-950">{draft.title}</h1>
          <p className="text-sm text-zinc-500">slug: {draft.slug}</p>
        </div>
        <DraftPublishButton draftId={draft.id} disabled={draft.status === 'published'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-950">创作会话</h2>
          <DraftChatPanel draftId={draft.id} initialMessages={messages} />
        </Card>
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-950">Meta</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">摘要</dt>
                <dd className="text-zinc-900">{draft.summary || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">设定</dt>
                <dd className="text-zinc-900">{draft.setting || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">难度</dt>
                <dd className="text-zinc-900">{draft.difficulty}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">工作目录</dt>
                <dd className="text-right text-xs text-zinc-700">{draft.workspacePath}</dd>
              </div>
            </dl>
          </Card>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-zinc-950">数据概览</h2>
            <ul className="space-y-1 text-sm">
              {dataSummary.map((item) => (
                <li className="flex justify-between gap-4" key={item.key}>
                  <span className="text-zinc-500">{item.label}</span>
                  <span className="text-zinc-900">{item.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
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
