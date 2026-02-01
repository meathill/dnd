'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/app-shell';
import ConfirmDialog from '@/app/confirm-dialog';
import { useSession } from '@/lib/session/session-context';
import type { DmProfileDetail, DmProfileRule } from '@/lib/game/types';
import { Button } from '@/components/ui/button';
import DmProfileEditorForm from './dm-profile-editor-form';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 p-3 sm:p-4 lg:h-full lg:max-h-dvh lg:overflow-auto';

type DmProfileEditorPageProps = {
  profileId: string;
};

export function DmProfileEditorContent({ profileId }: DmProfileEditorPageProps) {
  const router = useRouter();
  const { session, requestAuth } = useSession();
  const isRoot = session?.isRoot ?? false;
  const [draft, setDraft] = useState<DmProfileDetail | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<DmProfileRule | null>(null);

  const displayStatus = statusMessage || (isLoading ? '正在加载...' : '');

  const loadProfile = useCallback(
    async function loadProfile() {
      if (!isRoot) {
        return;
      }
      setIsLoading(true);
      setStatusMessage('');
      try {
        const response = await fetch(`/api/admin/dm-profiles/${profileId}`, { cache: 'no-store' });
        const data = (await response.json()) as { profile?: DmProfileDetail; error?: string };
        if (!response.ok || !data.profile) {
          throw new Error(data.error ?? 'DM 风格读取失败');
        }
        setDraft(data.profile);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'DM 风格读取失败';
        setStatusMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [profileId, isRoot],
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleRequestAuth() {
    requestAuth();
  }

  function handleBackToList() {
    router.push('/admin/dm-profiles');
  }

  function handleDraftChange(next: DmProfileDetail | ((current: DmProfileDetail) => DmProfileDetail)) {
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

  async function handleSaveProfile() {
    if (!draft) {
      return;
    }
    if (!draft.name.trim() || !draft.summary.trim()) {
      setStatusMessage('请完整填写 DM 风格名称与简介。');
      return;
    }
    setIsSaving(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          summary: draft.summary.trim(),
          analysisGuide: draft.analysisGuide,
          narrationGuide: draft.narrationGuide,
          isDefault: draft.isDefault,
        }),
      });
      const data = (await response.json()) as { profile?: DmProfileDetail; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? 'DM 风格保存失败');
      }
      setDraft(data.profile);
      setStatusMessage('DM 风格已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DM 风格保存失败';
      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleAskDeleteProfile() {
    if (!draft) {
      return;
    }
    setDeleteTarget({ id: draft.id, name: draft.name || '未命名风格' });
  }

  function handleCancelDeleteProfile() {
    setDeleteTarget(null);
  }

  async function handleConfirmDeleteProfile() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'DM 风格删除失败');
      }
      setStatusMessage('DM 风格已删除。');
      router.push('/admin/dm-profiles');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DM 风格删除失败';
      setStatusMessage(message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function handleCreateRule(payload: {
    phase: DmProfileRule['phase'];
    category: string;
    title: string;
    content: string;
    order: number;
    isEnabled: boolean;
  }) {
    if (!draft) {
      return false;
    }
    setIsCreatingRule(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${profileId}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { rule?: DmProfileRule; error?: string };
      if (!response.ok || !data.rule) {
        throw new Error(data.error ?? '规则创建失败');
      }
      setDraft((current) => {
        if (!current) {
          return current;
        }
        return { ...current, rules: [...current.rules, data.rule] };
      });
      setStatusMessage('规则已创建。');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : '规则创建失败';
      setStatusMessage(message);
      return false;
    } finally {
      setIsCreatingRule(false);
    }
  }

  async function handleSaveRule(rule: DmProfileRule) {
    setSavingRuleId(rule.id);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${profileId}/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase: rule.phase,
          category: rule.category,
          title: rule.title,
          content: rule.content,
          order: rule.order,
          isEnabled: rule.isEnabled,
        }),
      });
      const data = (await response.json()) as { rule?: DmProfileRule; error?: string };
      if (!response.ok || !data.rule) {
        throw new Error(data.error ?? '规则保存失败');
      }
      const updatedRule = data.rule;
      setDraft((current) => {
        if (!current) {
          return current;
        }
        const nextRules = current.rules.map((item) => (item.id === updatedRule.id ? updatedRule : item));
        return { ...current, rules: nextRules };
      });
      setStatusMessage('规则已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '规则保存失败';
      setStatusMessage(message);
    } finally {
      setSavingRuleId(null);
    }
  }

  function handleRequestDeleteRule(rule: DmProfileRule) {
    setDeleteRuleTarget(rule);
  }

  function handleCancelDeleteRule() {
    setDeleteRuleTarget(null);
  }

  async function handleConfirmDeleteRule() {
    if (!deleteRuleTarget) {
      return;
    }
    setDeletingRuleId(deleteRuleTarget.id);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${profileId}/rules/${deleteRuleTarget.id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '规则删除失败');
      }
      setDraft((current) => {
        if (!current) {
          return current;
        }
        return { ...current, rules: current.rules.filter((rule) => rule.id !== deleteRuleTarget.id) };
      });
      setStatusMessage('规则已删除。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '规则删除失败';
      setStatusMessage(message);
    } finally {
      setDeletingRuleId(null);
      setDeleteRuleTarget(null);
    }
  }

  if (!session) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>DM 风格编辑</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要登录</h2>
        <p className="text-sm text-[var(--ink-muted)]">请先登录后再管理 DM 风格。</p>
        <Button onClick={handleRequestAuth} size="sm">
          登录 / 注册
        </Button>
      </section>
    );
  }

  if (!isRoot) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>DM 风格编辑</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要 Root 权限</h2>
        <p className="text-sm text-[var(--ink-muted)]">当前账号没有管理 DM 风格的权限。</p>
      </section>
    );
  }

  if (!draft) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>DM 风格编辑</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
          {isLoading ? '正在读取 DM 风格...' : '无法读取 DM 风格'}
        </h2>
        <p className="text-sm text-[var(--ink-muted)]">{displayStatus || '请返回列表重新选择。'}</p>
        <Button onClick={handleBackToList} size="sm" variant="outline">
          返回列表
        </Button>
      </section>
    );
  }

  return (
    <div className="grid lg:h-full lg:overflow-hidden">
      <section className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>DM 风格编辑</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{draft.name || '未命名风格'}</h2>
            <p className="text-xs text-[var(--ink-muted)]">编号：{draft.id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBackToList} size="sm" variant="outline">
              返回列表
            </Button>
            <Button disabled={isSaving} onClick={handleSaveProfile} size="sm">
              {isSaving ? '保存中...' : '保存修改'}
            </Button>
            <Button disabled={isDeleting} onClick={handleAskDeleteProfile} size="sm" variant="destructive">
              删除风格
            </Button>
          </div>
        </div>

        {displayStatus ? <p className="text-xs text-[var(--accent-ember)]">{displayStatus}</p> : null}

        <DmProfileEditorForm
          draft={draft}
          onDraftChange={handleDraftChange}
          onSaveRule={handleSaveRule}
          onCreateRule={handleCreateRule}
          onRequestDeleteRule={handleRequestDeleteRule}
          savingRuleId={savingRuleId}
          deletingRuleId={deletingRuleId}
          isCreatingRule={isCreatingRule}
        />
      </section>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="删除 DM 风格"
        description={deleteTarget ? `确定要删除「${deleteTarget.name}」吗？` : ''}
        confirmLabel="删除风格"
        isProcessing={isDeleting}
        onCancel={handleCancelDeleteProfile}
        onConfirm={handleConfirmDeleteProfile}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteRuleTarget)}
        title="删除规则"
        description={deleteRuleTarget ? `确定要删除「${deleteRuleTarget.title}」吗？` : ''}
        confirmLabel="删除规则"
        isProcessing={Boolean(deletingRuleId)}
        onCancel={handleCancelDeleteRule}
        onConfirm={handleConfirmDeleteRule}
      />
    </div>
  );
}

export default function DmProfileEditorPage({ profileId }: DmProfileEditorPageProps) {
  return (
    <AppShell activeNav="admin-dm">
      <DmProfileEditorContent profileId={profileId} />
    </AppShell>
  );
}
