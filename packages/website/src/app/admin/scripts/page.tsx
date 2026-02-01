'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/app-shell';
import { useSession } from '@/lib/session/session-context';
import type { ScriptDefinition } from '@/lib/game/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 py-3 sm:py-4 lg:h-full lg:max-h-dvh';

type ScriptCreateDraft = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
};

function buildCreateDraft(): ScriptCreateDraft {
  return {
    id: '',
    title: '',
    summary: '',
    setting: '',
    difficulty: '',
  };
}

function formatScriptLabel(script: ScriptDefinition): string {
  return `${script.title} · ${script.setting}`;
}

function AdminScriptsContent() {
  const router = useRouter();
  const { session, requestAuth } = useSession();
  const isRoot = session?.isRoot ?? false;
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [createDraft, setCreateDraft] = useState<ScriptCreateDraft>(buildCreateDraft());
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const displayStatus = statusMessage || (isLoading ? '正在加载...' : '');

  const scriptOptions = useMemo(() => {
    return [...scripts].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
  }, [scripts]);

  const loadScripts = useCallback(
    async function loadScripts() {
      if (!isRoot) {
        return;
      }
      setIsLoading(true);
      setStatusMessage('');
      try {
        const response = await fetch('/api/admin/scripts', { cache: 'no-store' });
        const data = (await response.json()) as { scripts?: ScriptDefinition[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? '剧本列表读取失败');
        }
        setScripts(data.scripts ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : '剧本列表读取失败';
        setStatusMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [isRoot],
  );

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  function handleRequestAuth() {
    requestAuth();
  }

  function handleCreateDraftChange(value: string, field: keyof ScriptCreateDraft) {
    setCreateDraft((current) => ({ ...current, [field]: value }));
  }

  async function handleCreateScript() {
    const title = createDraft.title.trim();
    const summary = createDraft.summary.trim();
    const setting = createDraft.setting.trim();
    const difficulty = createDraft.difficulty.trim();
    if (!title || !summary || !setting || !difficulty) {
      setStatusMessage('请完整填写剧本基础信息。');
      return;
    }
    setIsCreating(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/admin/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: createDraft.id.trim() || undefined,
          title,
          summary,
          setting,
          difficulty,
        }),
      });
      const data = (await response.json()) as { script?: ScriptDefinition; error?: string };
      if (!response.ok || !data.script) {
        throw new Error(data.error ?? '剧本创建失败');
      }
      setCreateDraft(buildCreateDraft());
      router.push(`/admin/scripts/${data.script.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本创建失败';
      setStatusMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenScript(scriptId: string) {
    router.push(`/admin/scripts/${scriptId}`);
  }

  if (!session) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>剧本列表</p>
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
        <p className={sectionTitleClassName}>剧本列表</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要 Root 权限</h2>
        <p className="text-sm text-[var(--ink-muted)]">当前账号没有管理剧本的权限。</p>
      </section>
    );
  }

  return (
    <div className="grid px-4 gap-4 lg:h-full lg:grid-cols-[18rem_minmax(0,1fr)] lg:overflow-hidden">
      <section className={`${panelClassName} lg:overflow-auto`}>
        <div>
          <p className={sectionTitleClassName}>新建剧本</p>
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">基础信息</h2>
          <p className="text-xs text-[var(--ink-muted)]">创建后进入剧本编辑页。</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]">剧本编号（可选）</Label>
          <Input
            value={createDraft.id}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'id')}
            placeholder="script-your-id"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]">标题</Label>
          <Input
            value={createDraft.title}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'title')}
            placeholder="剧本标题"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]">简介</Label>
          <Textarea
            value={createDraft.summary}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'summary')}
            placeholder="简短介绍剧本"
            rows={3}
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]">时代背景</Label>
          <Input
            value={createDraft.setting}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'setting')}
            placeholder="现代 / 中世纪 / 未来"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]">难度</Label>
          <Input
            value={createDraft.difficulty}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'difficulty')}
            placeholder="中等偏下"
          />
        </div>
        <Button disabled={isCreating} onClick={handleCreateScript} size="sm">
          {isCreating ? '创建中...' : '创建剧本'}
        </Button>
        {displayStatus ? <p className="text-xs text-[var(--accent-ember)]">{displayStatus}</p> : null}
      </section>

      <section className={`${panelClassName} lg:overflow-auto`}>
        <div>
          <p className={sectionTitleClassName}>剧本列表</p>
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">已有剧本</h2>
          <p className="text-xs text-[var(--ink-muted)]">选择剧本进入编辑模式。</p>
        </div>
        {scriptOptions.length === 0 ? (
          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 text-xs text-[var(--ink-soft)]">
            暂无剧本，请先创建。
          </div>
        ) : (
          <div className="space-y-3">
            {scriptOptions.map((script) => (
              <div
                className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3 text-sm"
                key={script.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink-strong)]">{formatScriptLabel(script)}</p>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{script.summary}</p>
                    <p className="mt-1 text-[10px] text-[var(--ink-soft)]">编号：{script.id}</p>
                  </div>
                  <Button onClick={() => handleOpenScript(script.id)} size="sm" variant="outline">
                    编辑
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminScriptsPage() {
  return (
    <AppShell activeNav="admin-scripts">
      <AdminScriptsContent />
    </AppShell>
  );
}
