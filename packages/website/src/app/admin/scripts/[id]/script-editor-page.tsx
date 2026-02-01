'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/app-shell';
import ConfirmDialog from '@/app/confirm-dialog';
import { useSession } from '@/lib/session/session-context';
import type { ScriptDefinition } from '@/lib/game/types';
import { Button } from '@/components/ui/button';
import ScriptEditorForm from './script-editor-form';
import type { ScriptDraft } from './script-editor-types';
import { buildScriptDefinition, buildScriptDraft } from './script-editor-mappers';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 p-3 sm:p-4 lg:h-full lg:max-h-dvh lg:overflow-auto';

type ScriptEditorPageProps = {
  scriptId: string;
};

function ScriptEditorContent({ scriptId }: ScriptEditorPageProps) {
  const router = useRouter();
  const { session, requestAuth } = useSession();
  const isRoot = session?.isRoot ?? false;
  const [draft, setDraft] = useState<ScriptDraft | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const displayStatus = statusMessage || (isLoading ? '正在加载...' : '');

  const loadScript = useCallback(
    async function loadScript() {
      if (!isRoot) {
        return;
      }
      setIsLoading(true);
      setStatusMessage('');
      try {
        const response = await fetch(`/api/admin/scripts/${scriptId}`, { cache: 'no-store' });
        const data = (await response.json()) as { script?: ScriptDefinition; error?: string };
        if (!response.ok || !data.script) {
          throw new Error(data.error ?? '剧本读取失败');
        }
        setDraft(buildScriptDraft(data.script));
      } catch (error) {
        const message = error instanceof Error ? error.message : '剧本读取失败';
        setStatusMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [scriptId, isRoot],
  );

  useEffect(() => {
    loadScript();
  }, [loadScript]);

  function handleRequestAuth() {
    requestAuth();
  }

  function handleBackToList() {
    router.push('/admin/scripts');
  }

  async function handleSave() {
    if (!draft) {
      return;
    }
    if (!draft.title.trim() || !draft.summary.trim() || !draft.setting.trim() || !draft.difficulty.trim()) {
      setStatusMessage('请完整填写剧本基础信息。');
      return;
    }
    setIsSaving(true);
    setStatusMessage('');
    try {
      const payload = buildScriptDefinition(draft);
      const response = await fetch(`/api/admin/scripts/${scriptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { script?: ScriptDefinition; error?: string };
      if (!response.ok || !data.script) {
        throw new Error(data.error ?? '剧本保存失败');
      }
      setDraft(buildScriptDraft(data.script));
      setStatusMessage('剧本已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本保存失败';
      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleAskDelete() {
    if (!draft) {
      return;
    }
    setDeleteTarget({ id: draft.id, title: draft.title || '未命名剧本' });
  }

  function handleCancelDelete() {
    setDeleteTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/scripts/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '剧本删除失败');
      }
      setStatusMessage('剧本已删除。');
      router.push('/admin/scripts');
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本删除失败';
      setStatusMessage(message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handleDraftChange(next: ScriptDraft | ((current: ScriptDraft) => ScriptDraft)) {
    setDraft((current) => {
      if (!current) {
        return current;
      }
      if (typeof next === 'function') {
        return next(current);
      }
      return next;
    });
  }

  if (!session) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>剧本编辑</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要登录</h2>
        <p className="text-sm text-[var(--ink-muted)]">请先登录后再管理剧本。</p>
        <Button onClick={handleRequestAuth} size="sm">
          登录 / 注册
        </Button>
      </section>
    );
  }

  if (!isRoot) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>剧本编辑</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要 Root 权限</h2>
        <p className="text-sm text-[var(--ink-muted)]">当前账号没有管理剧本的权限。</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>剧本编辑</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
          {isLoading ? '正在读取剧本...' : '无法读取剧本'}
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">{displayStatus || '请返回列表重新选择。'}</p>
        <Button onClick={handleBackToList} size="sm" variant="outline">
          返回列表
        </Button>
      </section>
    );
  }

  return (
    <>
      <section className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>剧本编辑</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{draft.title || '未命名剧本'}</h2>
            <p className="text-xs text-[var(--ink-muted)]">编号：{draft.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBackToList} size="sm" variant="outline">
              返回列表
            </Button>
            <Button disabled={isSaving} onClick={handleSave} size="sm">
              {isSaving ? '保存中...' : '保存修改'}
            </Button>
            <Button disabled={isDeleting} onClick={handleAskDelete} size="sm" variant="destructive">
              删除剧本
            </Button>
          </div>
        </div>

        {displayStatus ? <p className="text-xs text-[var(--accent-ember)]">{displayStatus}</p> : null}

        <ScriptEditorForm draft={draft} onDraftChange={handleDraftChange} />
      </section>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="删除剧本"
        description={deleteTarget ? `确定要删除「${deleteTarget.title}」吗？` : ''}
        confirmLabel="删除剧本"
        isProcessing={isDeleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export default function ScriptEditorPage({ scriptId }: ScriptEditorPageProps) {
  return (
    <AppShell activeNav="admin-scripts">
      <ScriptEditorContent scriptId={scriptId} />
    </AppShell>
  );
}
