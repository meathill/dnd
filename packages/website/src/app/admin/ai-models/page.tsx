'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/app/app-shell';
import GlobalConfigShell from '@/app/admin/global-config-shell';
import { useSession } from '@/lib/session/session-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AiModelKind, AiModelRecord, AiProvider } from '@/lib/ai/ai-types';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 p-3 sm:p-4 lg:max-h-dvh lg:overflow-auto';

type DraftState = {
  id: string | null;
  provider: AiProvider;
  kind: AiModelKind;
  modelId: string;
  label: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  sortOrder: string;
  isActive: boolean;
};

function emptyDraft(): DraftState {
  return {
    id: null,
    provider: 'openai',
    kind: 'general',
    modelId: '',
    label: '',
    description: '',
    baseUrl: '',
    apiKey: '',
    sortOrder: '0',
    isActive: true,
  };
}

function fromRecord(record: AiModelRecord): DraftState {
  return {
    id: record.id,
    provider: record.provider,
    kind: record.kind,
    modelId: record.modelId,
    label: record.label,
    description: record.description,
    baseUrl: record.baseUrl,
    apiKey: record.apiKey,
    sortOrder: String(record.sortOrder),
    isActive: record.isActive,
  };
}

function maskKey(key: string): string {
  if (!key) return '未设置';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

function AdminAiModelsContent() {
  const { session, requestAuth } = useSession();
  const [models, setModels] = useState<AiModelRecord[]>([]);
  const [draft, setDraft] = useState<DraftState>(emptyDraft());
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const loadModels = useCallback(
    async function loadModels() {
      if (!session) return;
      setIsLoading(true);
      setStatusMessage('');
      try {
        const response = await fetch('/api/admin/ai-models', { cache: 'no-store' });
        const data = (await response.json()) as { models?: AiModelRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? '读取 AI 模型失败');
        setModels(data.models ?? []);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : '读取 AI 模型失败');
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  function handleOpenCreateDialog() {
    setDraft(emptyDraft());
    setStatusMessage('');
    setIsDialogOpen(true);
  }

  function handleOpenEditDialog(record: AiModelRecord) {
    setDraft(fromRecord(record));
    setStatusMessage('');
    setIsDialogOpen(true);
  }

  function handleCloseDialog() {
    if (isSaving) return;
    setIsDialogOpen(false);
  }

  async function handleSave() {
    if (!draft.modelId.trim() || !draft.label.trim()) {
      setStatusMessage('Model ID 与显示名称必填。');
      return;
    }
    setIsSaving(true);
    setStatusMessage('');
    try {
      const payload = {
        provider: draft.provider,
        kind: draft.kind,
        modelId: draft.modelId.trim(),
        label: draft.label.trim(),
        description: draft.description.trim(),
        baseUrl: draft.baseUrl.trim(),
        apiKey: draft.apiKey.trim(),
        sortOrder: Number(draft.sortOrder) || 0,
        isActive: draft.isActive,
      };
      const url = draft.id ? `/api/admin/ai-models/${draft.id}` : '/api/admin/ai-models';
      const method = draft.id ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { model?: AiModelRecord; error?: string };
      if (!response.ok || !data.model) throw new Error(data.error ?? '保存失败');
      setIsDialogOpen(false);
      setDraft(emptyDraft());
      await loadModels();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(record: AiModelRecord) {
    if (!confirm(`确定删除模型「${record.label}」？`)) return;
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/ai-models/${record.id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? '删除失败');
      }
      if (draft.id === record.id) setDraft(emptyDraft());
      await loadModels();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : '删除失败');
    }
  }

  if (!session) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>AI 模型管理</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要登录</h2>
        <Button onClick={() => requestAuth()} size="sm">
          登录 / 注册
        </Button>
      </section>
    );
  }

  const displayStatus = statusMessage || (isLoading ? '正在加载...' : '');
  const isEditing = Boolean(draft.id);

  return (
    <>
      <section className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>已配置模型</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">模型清单</h3>
            <p className="text-xs text-[var(--ink-muted)]">
              用户的「AI 提供方」选择会从此列表 + 内置目录中读取。
            </p>
          </div>
          <Button onClick={handleOpenCreateDialog} size="sm">
            新建模型
          </Button>
        </div>

        {displayStatus && !isDialogOpen ? (
          <p className="text-xs text-[var(--accent-ember)]">{displayStatus}</p>
        ) : null}

        {models.length === 0 ? (
          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 text-xs text-[var(--ink-soft)]">
            还没有自定义模型。点击右上角「新建模型」开始添加。
          </div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3 text-sm"
                key={model.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--ink-strong)]">{model.label}</p>
                      <Badge className="px-2 py-0.5 text-[10px]" variant="outline">
                        {model.provider}
                      </Badge>
                      <Badge className="px-2 py-0.5 text-[10px]" variant="outline">
                        {model.kind}
                      </Badge>
                      {!model.isActive ? (
                        <Badge className="px-2 py-0.5 text-[10px] text-[var(--ink-soft)]" variant="outline">
                          已停用
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 break-all text-xs text-[var(--ink-muted)]">
                      Model ID：<span className="font-mono">{model.modelId}</span>
                    </p>
                    {model.description ? (
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">{model.description}</p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-[var(--ink-soft)]">
                      Base URL：{model.baseUrl || '默认'} · API Key：{maskKey(model.apiKey)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button onClick={() => handleOpenEditDialog(model)} size="xs" variant="outline">
                      编辑
                    </Button>
                    <Button onClick={() => handleDelete(model)} size="xs" variant="destructive">
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={isDialogOpen} onOpenChange={(open) => (!open ? handleCloseDialog() : undefined)}>
        <DialogPopup className="max-w-xl">
          <DialogHeader>
            <p className={sectionTitleClassName}>{isEditing ? '编辑模型' : '新建模型'}</p>
            <DialogTitle className="text-xl font-semibold text-[var(--ink-strong)]">
              {isEditing ? draft.label || '未命名模型' : '添加 AI 模型'}
            </DialogTitle>
            <p className="text-xs text-[var(--ink-muted)]">
              创建后可在用户的「AI 提供方」面板中选择。可选填自定义 baseURL / API Key 以接入兼容服务。
            </p>
          </DialogHeader>

          <DialogPanel className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-[var(--ink-muted)]">Provider</Label>
                <Select
                  onValueChange={(value) => value && setDraft((d) => ({ ...d, provider: value as AiProvider }))}
                  value={draft.provider}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-[var(--ink-muted)]">用途（kind）</Label>
                <Select
                  onValueChange={(value) => value && setDraft((d) => ({ ...d, kind: value as AiModelKind }))}
                  value={draft.kind}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fast">fast（快速审查）</SelectItem>
                    <SelectItem value="general">general（通用智能）</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-[var(--ink-muted)]" htmlFor="aim-model-id">
                Model ID
              </Label>
              <Input
                id="aim-model-id"
                onChange={(event) => setDraft((d) => ({ ...d, modelId: event.target.value }))}
                placeholder="例如：gpt-5-mini、qwen-max、deepseek-chat"
                value={draft.modelId}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-[var(--ink-muted)]" htmlFor="aim-label">
                显示名称
              </Label>
              <Input
                id="aim-label"
                onChange={(event) => setDraft((d) => ({ ...d, label: event.target.value }))}
                placeholder="例如：GPT-5 Mini（快速）"
                value={draft.label}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-[var(--ink-muted)]" htmlFor="aim-desc">
                说明
              </Label>
              <Textarea
                id="aim-desc"
                onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
                placeholder="一句话说明用途/特点（可选）"
                rows={2}
                value={draft.description}
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-[var(--ink-muted)]" htmlFor="aim-base-url">
                Base URL（可选）
              </Label>
              <Input
                id="aim-base-url"
                onChange={(event) => setDraft((d) => ({ ...d, baseUrl: event.target.value }))}
                placeholder="例如 https://api.deepseek.com/v1"
                value={draft.baseUrl}
              />
              <p className="text-[10px] text-[var(--ink-soft)]">兼容 OpenAI 协议的代理地址；留空则使用默认。</p>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs text-[var(--ink-muted)]" htmlFor="aim-api-key">
                API Key（可选，仅管理员可见）
              </Label>
              <Input
                id="aim-api-key"
                onChange={(event) => setDraft((d) => ({ ...d, apiKey: event.target.value }))}
                placeholder={
                  draft.apiKey ? '留空表示不修改' : '为空时使用环境变量 OPENAI_API_KEY / GEMINI_API_KEY'
                }
                type="password"
                value={draft.apiKey}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-[var(--ink-muted)]" htmlFor="aim-sort">
                  排序
                </Label>
                <Input
                  id="aim-sort"
                  onChange={(event) => setDraft((d) => ({ ...d, sortOrder: event.target.value }))}
                  type="number"
                  value={draft.sortOrder}
                />
              </div>
              <div className="flex items-end justify-between rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-2">
                <div>
                  <p className="text-xs font-semibold text-[var(--ink-strong)]">启用</p>
                  <p className="text-[10px] text-[var(--ink-soft)]">关闭后用户面板中不显示。</p>
                </div>
                <Switch
                  aria-label="启用模型"
                  checked={draft.isActive}
                  onCheckedChange={(value) => setDraft((d) => ({ ...d, isActive: value }))}
                />
              </div>
            </div>

            {statusMessage ? <p className="text-xs text-[var(--accent-ember)]">{statusMessage}</p> : null}
          </DialogPanel>

          <DialogFooter className="justify-end" variant="bare">
            <Button disabled={isSaving} onClick={handleCloseDialog} size="sm" variant="outline">
              取消
            </Button>
            <Button disabled={isSaving} onClick={handleSave} size="sm">
              {isSaving ? '保存中...' : isEditing ? '保存修改' : '创建模型'}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}

export default function AdminAiModelsPage() {
  return (
    <AppShell activeNav="admin-dm">
      <GlobalConfigShell active="ai-models">
        <AdminAiModelsContent />
      </GlobalConfigShell>
    </AppShell>
  );
}
