'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../../app-shell';
import ConfirmDialog from '../../confirm-dialog';
import { useSession } from '../../../lib/session/session-context';
import type { ScriptDefinition } from '../../../lib/game/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 rounded-lg p-3 sm:p-4 lg:h-full max-h-dvh lg:overflow-auto';

type ScriptAdvancedPayload = Omit<ScriptDefinition, 'id' | 'title' | 'summary' | 'setting' | 'difficulty'>;

type ScriptDraft = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  advancedJson: string;
};

type ScriptCreateDraft = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
};

function buildEmptyAdvancedPayload(): ScriptAdvancedPayload {
  return {
    openingMessages: [],
    background: { overview: '', truth: '', themes: [], factions: [], locations: [], secrets: [] },
    storyArcs: [],
    enemyProfiles: [],
    skillOptions: [],
    equipmentOptions: [],
    occupationOptions: [],
    originOptions: [],
    buffOptions: [],
    debuffOptions: [],
    attributeRanges: {},
    attributePointBudget: 0,
    skillLimit: 0,
    equipmentLimit: 0,
    buffLimit: 0,
    debuffLimit: 0,
    rules: {},
    scenes: [],
    encounters: [],
  };
}

function buildAdvancedPayload(script: ScriptDefinition): ScriptAdvancedPayload {
  return {
    openingMessages: script.openingMessages,
    background: script.background,
    storyArcs: script.storyArcs,
    enemyProfiles: script.enemyProfiles,
    skillOptions: script.skillOptions,
    equipmentOptions: script.equipmentOptions,
    occupationOptions: script.occupationOptions,
    originOptions: script.originOptions,
    buffOptions: script.buffOptions,
    debuffOptions: script.debuffOptions,
    attributeRanges: script.attributeRanges,
    attributePointBudget: script.attributePointBudget,
    skillLimit: script.skillLimit,
    equipmentLimit: script.equipmentLimit,
    buffLimit: script.buffLimit,
    debuffLimit: script.debuffLimit,
    rules: script.rules,
    scenes: script.scenes,
    encounters: script.encounters,
  };
}

function buildScriptDraft(script: ScriptDefinition | null): ScriptDraft {
  if (!script) {
    return {
      id: '',
      title: '',
      summary: '',
      setting: '',
      difficulty: '',
      advancedJson: JSON.stringify(buildEmptyAdvancedPayload(), null, 2),
    };
  }
  return {
    id: script.id,
    title: script.title,
    summary: script.summary,
    setting: script.setting,
    difficulty: script.difficulty,
    advancedJson: JSON.stringify(buildAdvancedPayload(script), null, 2),
  };
}

function buildCreateDraft(): ScriptCreateDraft {
  return {
    id: '',
    title: '',
    summary: '',
    setting: '',
    difficulty: '',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseAdvancedJson(raw: string): { ok: true; value: ScriptAdvancedPayload } | { ok: false; error: string } {
  const text = raw.trim();
  if (!text) {
    return { ok: true, value: buildEmptyAdvancedPayload() };
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!isRecord(parsed)) {
      return { ok: false, error: '高级配置需要是对象格式的 JSON。' };
    }
    return { ok: true, value: parsed as ScriptAdvancedPayload };
  } catch {
    return { ok: false, error: '高级配置不是合法的 JSON。' };
  }
}

function formatScriptLabel(script: ScriptDefinition): string {
  return `${script.title} · ${script.setting}`;
}

function AdminScriptsContent() {
  const { session, requestAuth } = useSession();
  const isRoot = session?.isRoot ?? false;
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [activeScriptId, setActiveScriptId] = useState<string | null>(null);
  const [activeScript, setActiveScript] = useState<ScriptDefinition | null>(null);
  const [draft, setDraft] = useState<ScriptDraft>(buildScriptDraft(null));
  const [createDraft, setCreateDraft] = useState<ScriptCreateDraft>(buildCreateDraft());
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ScriptDefinition | null>(null);

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
        const list = data.scripts ?? [];
        setScripts(list);
      } catch (error) {
        const message = error instanceof Error ? error.message : '剧本列表读取失败';
        setStatusMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [isRoot],
  );

  const loadScriptDetail = useCallback(async function loadScriptDetail(scriptId: string) {
    if (!scriptId) {
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
      setActiveScript(data.script);
      setDraft(buildScriptDraft(data.script));
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本读取失败';
      setStatusMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  useEffect(() => {
    if (!activeScriptId && scripts.length > 0) {
      setActiveScriptId(scripts[0].id);
    }
  }, [activeScriptId, scripts]);

  useEffect(() => {
    if (!activeScriptId) {
      setActiveScript(null);
      setDraft(buildScriptDraft(null));
      return;
    }
    loadScriptDetail(activeScriptId);
  }, [activeScriptId, loadScriptDetail]);

  function handleRequestAuth() {
    requestAuth();
  }

  function handleSelectScript(scriptId: string) {
    setActiveScriptId(scriptId);
  }

  function handleDraftChange(value: string, field: keyof ScriptDraft) {
    setDraft((current) => ({ ...current, [field]: value }));
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
      setScripts((current) => [data.script!, ...current]);
      setActiveScriptId(data.script.id);
      setCreateDraft(buildCreateDraft());
      setStatusMessage('剧本已创建。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本创建失败';
      setStatusMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSaveScript() {
    if (!activeScript) {
      return;
    }
    const title = draft.title.trim();
    const summary = draft.summary.trim();
    const setting = draft.setting.trim();
    const difficulty = draft.difficulty.trim();
    if (!title || !summary || !setting || !difficulty) {
      setStatusMessage('请完整填写剧本基础信息。');
      return;
    }
    const advancedResult = parseAdvancedJson(draft.advancedJson);
    if (!advancedResult.ok) {
      setStatusMessage(advancedResult.error);
      return;
    }
    setIsSaving(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/scripts/${activeScript.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeScript.id,
          title,
          summary,
          setting,
          difficulty,
          ...advancedResult.value,
        }),
      });
      const data = (await response.json()) as { script?: ScriptDefinition; error?: string };
      if (!response.ok || !data.script) {
        throw new Error(data.error ?? '剧本保存失败');
      }
      setActiveScript(data.script);
      setDraft(buildScriptDraft(data.script));
      setScripts((current) => current.map((item) => (item.id === data.script!.id ? data.script! : item)));
      setStatusMessage('剧本已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本保存失败';
      setStatusMessage(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDeleteScript() {
    if (!activeScript) {
      return;
    }
    setDeleteTarget(activeScript);
  }

  function handleCancelDelete() {
    setDeleteTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/scripts/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '剧本删除失败');
      }
      setScripts((current) => current.filter((item) => item.id !== deleteTarget.id));
      if (activeScriptId === deleteTarget.id) {
        setActiveScriptId(null);
      }
      setStatusMessage('剧本已删除。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '剧本删除失败';
      setStatusMessage(message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!session) {
    return (
      <div className="grid gap-4 p-3 sm:p-4 lg:h-full lg:overflow-hidden">
        <section className={panelClassName}>
          <p className={sectionTitleClassName}>剧本编辑器</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要登录</h2>
          <p className="text-sm text-[var(--ink-muted)]">请先登录后再管理剧本。</p>
          <Button onClick={handleRequestAuth} size="sm">
            登录 / 注册
          </Button>
        </section>
      </div>
    );
  }

  if (!isRoot) {
    return (
      <div className="grid gap-4 p-3 sm:p-4 lg:h-full lg:overflow-hidden">
        <section className={panelClassName}>
          <p className={sectionTitleClassName}>剧本编辑器</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要 Root 权限</h2>
          <p className="text-sm text-[var(--ink-muted)]">当前账号没有管理剧本的权限。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="grid lg:h-dvh lg:grid-cols-[18rem_minmax(0,1fr)] lg:overflow-hidden">
      <aside className={panelClassName}>
        <div className="space-y-2">
          <p className={sectionTitleClassName}>新建剧本</p>
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
        </div>

        <div className="mt-2 space-y-2 overflow-auto">
          <p className={sectionTitleClassName}>已有剧本</p>
          {scriptOptions.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)]">暂无剧本，请先创建。</p>
          ) : (
            <div className="space-y-2">
              {scriptOptions.map((script) => (
                <Button
                  key={script.id}
                  className="w-full justify-start text-left"
                  onClick={() => handleSelectScript(script.id)}
                  size="sm"
                  variant={activeScriptId === script.id ? 'default' : 'outline'}
                >
                  {formatScriptLabel(script)}
                </Button>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>剧本详情</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
              {activeScript ? activeScript.title : '请选择剧本'}
            </h2>
            {draft.id ? <p className="text-xs text-[var(--ink-muted)]">编号：{draft.id}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!activeScript || isSaving} onClick={handleSaveScript} size="sm">
              {isSaving ? '保存中...' : '保存修改'}
            </Button>
            <Button disabled={!activeScript} onClick={handleDeleteScript} size="sm" variant="destructive">
              删除剧本
            </Button>
          </div>
        </div>

        {displayStatus ? <p className="text-sm text-[var(--ink-muted)]">{displayStatus}</p> : null}

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label className="text-xs text-[var(--ink-muted)]">标题</Label>
            <Input
              value={draft.title}
              onChange={(event) => handleDraftChange(event.target.value, 'title')}
              placeholder="剧本标题"
              disabled={!activeScript}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[var(--ink-muted)]">简介</Label>
            <Textarea
              value={draft.summary}
              onChange={(event) => handleDraftChange(event.target.value, 'summary')}
              placeholder="简短介绍剧本"
              rows={3}
              disabled={!activeScript}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[var(--ink-muted)]">时代背景</Label>
            <Input
              value={draft.setting}
              onChange={(event) => handleDraftChange(event.target.value, 'setting')}
              placeholder="现代 / 中世纪 / 未来"
              disabled={!activeScript}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[var(--ink-muted)]">难度</Label>
            <Input
              value={draft.difficulty}
              onChange={(event) => handleDraftChange(event.target.value, 'difficulty')}
              placeholder="中等偏下"
              disabled={!activeScript}
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-xs text-[var(--ink-muted)]">高级配置 JSON</Label>
            <Textarea
              value={draft.advancedJson}
              onChange={(event) => handleDraftChange(event.target.value, 'advancedJson')}
              placeholder="填写剧本细节配置"
              rows={16}
              disabled={!activeScript}
            />
            <p className="text-xs text-[var(--ink-muted)]">包含开场对白、背景、敌人、选项、规则覆盖、场景与遭遇。</p>
          </div>
        </div>
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
