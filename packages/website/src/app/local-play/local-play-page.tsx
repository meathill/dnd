'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DownloadIcon, RefreshCcwIcon, SaveIcon } from 'lucide-react';
import AppShell from '@/app/app-shell';
import CharacterCardPanel from '@/app/character-card-panel';
import CharacterCreator from '@/app/character-creator';
import ConfirmDialog from '@/app/confirm-dialog';
import SceneMapPanel from '@/app/scene-map-panel';
import ScriptEditorForm from '@/app/admin/scripts/[id]/script-editor-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useGameStore } from '@/lib/game/game-store';
import {
  buildCharacterRecordFromForm,
  buildDefaultLocalScript,
  buildFormStateFromCharacter,
  buildInitialLocalMemory,
  buildInitialLocalMessages,
  buildLocalPlayReport,
  buildLocalScriptDraft,
  exportLocalPlayAsJson,
  exportLocalPlayAsMarkdown,
  runLocalPlayTurn,
  type LocalPlayStorage,
} from '@/lib/game/local-play';
import { buildScriptDefinition } from '@/app/admin/scripts/[id]/script-editor-mappers';
import { validateCharacterAgainstScript } from '@/lib/game/validators';
import type { FormState, SubmitResult } from '@/app/character-creator-data';
import type { CharacterRecord, ChatMessage, GameMemorySnapshot } from '@/lib/game/types';

const STORAGE_KEY = 'dnd-local-play-state-v1';
const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4';

function readStorage(): LocalPlayStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as LocalPlayStorage;
  } catch {
    return null;
  }
}

function writeStorage(value: LocalPlayStorage) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function clearStorage() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

function downloadText(filename: string, content: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatSavedAt(value: string): string {
  if (!value) {
    return '尚未保存';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '尚未保存';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function parseInventoryText(value: string): string[] {
  return value
    .replace(/[、，,]/g, '\n')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderModules(modules: ChatMessage['modules']) {
  if (!modules || modules.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      {modules.map((module, index) => (
        <div
          className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 px-3 py-2"
          key={`${module.type}-${index}`}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{module.type}</p>
          {'content' in module ? (
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--ink-strong)]">{module.content}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function getPlayabilityVariant(hasWarnings: boolean): 'warning' | 'success' {
  return hasWarnings ? 'warning' : 'success';
}

function buildStoredState(params: {
  draft: LocalPlayStorage['draft'];
  character: CharacterRecord | null;
  messages: ChatMessage[];
  memory: GameMemorySnapshot | null;
}): LocalPlayStorage {
  return {
    draft: params.draft,
    character: params.character,
    characterForm: params.character ? buildFormStateFromCharacter(params.character) : null,
    messages: params.messages,
    memory: params.memory,
    updatedAt: new Date().toISOString(),
  };
}

export function LocalPlayContent() {
  const setPhase = useGameStore((state) => state.setPhase);
  const selectScript = useGameStore((state) => state.selectScript);
  const setActiveGameId = useGameStore((state) => state.setActiveGameId);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const setMemory = useGameStore((state) => state.setMemory);
  const setMapText = useGameStore((state) => state.setMapText);
  const messageListRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState(() => buildLocalScriptDraft());
  const [character, setLocalCharacter] = useState<CharacterRecord | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setLocalMemory] = useState<GameMemorySnapshot | null>(null);
  const [inputText, setInputText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState('module');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [editorFormState, setEditorFormState] = useState<FormState | undefined>(undefined);
  const [openRequestId, setOpenRequestId] = useState(0);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [savedAt, setSavedAt] = useState('');

  const script = useMemo(() => buildScriptDefinition(draft), [draft]);
  const report = useMemo(() => buildLocalPlayReport(script), [script]);

  useEffect(() => {
    setPhase('script');
    setActiveGameId(null);
    selectScript(script.id);
  }, [script.id, selectScript, setActiveGameId, setPhase]);

  useEffect(() => {
    const stored = readStorage();
    if (!stored) {
      const defaultScript = buildDefaultLocalScript();
      const initialMessages = buildInitialLocalMessages(defaultScript);
      const initialMemory = buildInitialLocalMemory(defaultScript, null);
      const initialDraft = buildLocalScriptDraft(defaultScript);
      const nextStorage = buildStoredState({
        draft: initialDraft,
        character: null,
        messages: initialMessages,
        memory: initialMemory,
      });
      writeStorage(nextStorage);
      setMessages(initialMessages);
      setLocalMemory(initialMemory);
      setDraft(initialDraft);
      setSavedAt(nextStorage.updatedAt);
      setMemory(initialMemory);
      setMapText(initialMemory.mapText);
      setStatusMessage('已载入默认本地模组，可直接开始编辑或建卡。');
      return;
    }
    setDraft(stored.draft);
    setLocalCharacter(stored.character ?? null);
    setMessages(stored.messages ?? []);
    setLocalMemory(stored.memory ?? null);
    setSavedAt(stored.updatedAt ?? '');
    setStatusMessage('已恢复本地进度。');
    if (stored.character) {
      setCharacter(stored.character);
    }
    if (stored.memory) {
      setMemory(stored.memory);
      setMapText(stored.memory.mapText);
    }
  }, [setCharacter, setMapText, setMemory]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const storage = buildStoredState({ draft, character, messages, memory });
    writeStorage(storage);
    setSavedAt(storage.updatedAt);
  }, [character, draft, memory, messages]);

  useEffect(() => {
    setCharacter(character);
  }, [character, setCharacter]);

  useEffect(() => {
    setMemory(memory);
    setMapText(memory?.mapText ?? null);
  }, [memory, setMapText, setMemory]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  function handleDraftChange(next: typeof draft | ((current: typeof draft) => typeof draft)) {
    setDraft((current) => (typeof next === 'function' ? next(current) : next));
  }

  async function handleCharacterComplete(formState: FormState): Promise<SubmitResult> {
    const errors = validateCharacterAgainstScript(
      {
        scriptId: script.id,
        name: formState.name,
        occupation: formState.occupation,
        age: formState.age,
        origin: formState.origin,
        appearance: formState.appearance,
        background: formState.background,
        motivation: formState.motivation,
        avatar: formState.avatar,
        luck: formState.luck,
        attributes: formState.attributes,
        skills: formState.skills,
        inventory: parseInventoryText(formState.inventory),
        buffs: formState.buffs,
        debuffs: formState.debuffs,
        note: formState.note,
      },
      script,
    );
    if (Object.keys(errors).length > 0) {
      return { ok: false, fieldErrors: errors, message: '人物卡字段不合法' };
    }
    const nextCharacter = buildCharacterRecordFromForm(formState, script.id, character);
    setLocalCharacter(nextCharacter);
    const initialMessages = buildInitialLocalMessages(script);
    const initialMemory = buildInitialLocalMemory(script, nextCharacter);
    setMessages(initialMessages);
    setLocalMemory(initialMemory);
    setEditorMode('edit');
    setEditorFormState(buildFormStateFromCharacter(nextCharacter));
    setStatusMessage('本地人物卡已保存，可以直接开始游玩。');
    setActiveTab('play');
    return { ok: true };
  }

  function handleEditCharacter() {
    if (!character) {
      return;
    }
    setEditorMode('edit');
    setEditorFormState(buildFormStateFromCharacter(character));
    setOpenRequestId((value) => value + 1);
  }

  function handleCreateCharacter() {
    setEditorMode(character ? 'edit' : 'create');
    setEditorFormState(character ? buildFormStateFromCharacter(character) : undefined);
    setOpenRequestId((value) => value + 1);
  }

  function handleStartLocalPlay() {
    if (!character) {
      setStatusMessage('请先创建人物卡。');
      setActiveTab('character');
      return;
    }
    const initialMessages = buildInitialLocalMessages(script);
    const initialMemory = buildInitialLocalMemory(script, character);
    setMessages(initialMessages);
    setLocalMemory(initialMemory);
    setStatusMessage('本地跑团已重置到开场。');
    setActiveTab('play');
  }

  function handleSend() {
    if (!character) {
      setStatusMessage('请先创建人物卡。');
      setActiveTab('character');
      return;
    }
    const content = inputText.trim();
    if (!content) {
      return;
    }
    const baseMessages = messages.length > 0 ? messages : buildInitialLocalMessages(script);
    const baseMemory = memory ?? buildInitialLocalMemory(script, character);
    const result = runLocalPlayTurn({
      script,
      character,
      input: content,
      previousMessages: baseMessages,
      previousMemory: baseMemory,
    });
    setMessages(result.messages);
    setLocalMemory(result.memory);
    setInputText('');
    setStatusMessage('已完成本地裁定。');
  }

  function handleExportMarkdown() {
    const content = exportLocalPlayAsMarkdown({ script, character, messages, memory });
    downloadText(`${script.id}-report.md`, content, 'text/markdown;charset=utf-8');
    setStatusMessage('已导出 Markdown 战报。');
  }

  function handleExportJson() {
    const content = exportLocalPlayAsJson({ script, character, messages, memory });
    downloadText(`${script.id}-report.json`, content, 'application/json;charset=utf-8');
    setStatusMessage('已导出 JSON 战报。');
  }

  async function handleCopyMarkdown() {
    try {
      await navigator.clipboard.writeText(exportLocalPlayAsMarkdown({ script, character, messages, memory }));
      setStatusMessage('已复制 Markdown 战报。');
    } catch {
      setStatusMessage('复制失败，请直接使用导出。');
    }
  }

  function handleResetAll() {
    const defaultScript = buildDefaultLocalScript();
    const nextDraft = buildLocalScriptDraft(defaultScript);
    const nextMessages = buildInitialLocalMessages(defaultScript);
    const nextMemory = buildInitialLocalMemory(defaultScript, null);
    setDraft(nextDraft);
    setLocalCharacter(null);
    setEditorFormState(undefined);
    setMessages(nextMessages);
    setLocalMemory(nextMemory);
    setInputText('');
    setActiveTab('module');
    setStatusMessage('本地数据已重置。');
    clearStorage();
    const nextStorage = buildStoredState({
      draft: nextDraft,
      character: null,
      messages: nextMessages,
      memory: nextMemory,
    });
    writeStorage(nextStorage);
    setSavedAt(nextStorage.updatedAt);
    setIsResetOpen(false);
  }

  const canPlay = Boolean(character);
  const hasMessages = messages.length > 0;
  const latestMarkdown = useMemo(
    () => exportLocalPlayAsMarkdown({ script, character, messages, memory }),
    [character, memory, messages, script],
  );

  return (
    <div className="grid gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden">
      <main className="panel-card flex flex-col gap-4 p-3 sm:p-4 lg:h-full lg:overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>本地闭环</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">创建模组 + 游玩 + 导出战报</h2>
            <p className="text-sm text-[var(--ink-muted)]">完全本地运行，不依赖登录、数据库或正式聊天 API。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getPlayabilityVariant(report.playability.warnings.length > 0)}>
              {report.playability.isPlayable ? '可直接试玩' : '需补充信息'}
            </Badge>
            <Badge variant="outline">上次保存：{formatSavedAt(savedAt)}</Badge>
            <Button onClick={() => setIsResetOpen(true)} size="sm" variant="outline">
              <RefreshCcwIcon />
              重置
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className={panelClassName}>
            <p className={sectionTitleClassName}>可玩性</p>
            <p className="mt-2 text-sm text-[var(--ink-strong)]">
              {report.playability.isPlayable ? '当前模组已满足本地试玩最小要求。' : '当前模组仍有缺口，建议先补齐。'}
            </p>
            <div className="mt-3 space-y-2 text-xs text-[var(--ink-muted)]">
              {report.playability.warnings.length > 0 ? (
                report.playability.warnings.map((item: string) => <p key={item}>- {item}</p>)
              ) : (
                <p>- 未发现明显阻塞项</p>
              )}
            </div>
          </div>
          <div className={panelClassName}>
            <p className={sectionTitleClassName}>遭遇风险</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {report.encounterRisks.map((item: (typeof report.encounterRisks)[number]) => (
                <Badge
                  key={item.encounterId}
                  variant={item.overallRisk === 'high' || item.overallRisk === 'deadly' ? 'warning' : 'secondary'}
                >
                  {item.title} · {item.overallRisk}
                </Badge>
              ))}
            </div>
          </div>
          <div className={panelClassName}>
            <p className={sectionTitleClassName}>快速入口</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button onClick={() => setActiveTab('module')} size="sm" variant="outline">
                编辑模组
              </Button>
              <Button onClick={handleCreateCharacter} size="sm" variant="outline">
                {character ? '编辑人物卡' : '创建人物卡'}
              </Button>
              <Button onClick={() => setActiveTab('export')} size="sm" variant="outline">
                导出战报
              </Button>
            </div>
          </div>
        </div>

        <Tabs className="min-h-0 flex-1" value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="underline">
            <TabsTrigger value="module">模组</TabsTrigger>
            <TabsTrigger value="character">角色</TabsTrigger>
            <TabsTrigger value="play">游玩</TabsTrigger>
            <TabsTrigger value="export">导出</TabsTrigger>
          </TabsList>

          <TabsContent className="min-h-0 overflow-auto pt-2" value="module">
            <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
              <aside className="space-y-3">
                <div className={panelClassName}>
                  <p className={sectionTitleClassName}>使用说明</p>
                  <div className="mt-2 space-y-2 text-xs text-[var(--ink-muted)]">
                    <p>1. 先把标题、背景、区域和场景补到能跑通。</p>
                    <p>2. 开场对白会直接成为本地跑团开场。</p>
                    <p>3. 修改会自动保存到浏览器本地。</p>
                  </div>
                </div>
                <div className={panelClassName}>
                  <p className={sectionTitleClassName}>回到正式流程</p>
                  <p className="mt-2 text-xs text-[var(--ink-muted)]">
                    本地页调通后，再把可复用能力接回登录 / DB 正式链路。
                  </p>
                  <Button className="mt-3 w-full" render={<Link href="/" />} size="sm" variant="outline">
                    返回首页
                  </Button>
                </div>
              </aside>
              <div className={panelClassName}>
                <ScriptEditorForm draft={draft} onDraftChange={handleDraftChange} />
              </div>
            </div>
          </TabsContent>

          <TabsContent className="min-h-0 overflow-auto pt-2" value="character">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <section className={panelClassName}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={sectionTitleClassName}>本地人物卡</p>
                    <h3 className="text-lg font-semibold text-[var(--ink-strong)]">
                      {character ? '编辑当前人物卡' : '创建调查员'}
                    </h3>
                    <p className="text-sm text-[var(--ink-muted)]">保存后会直接成为本地跑团使用的角色。</p>
                  </div>
                  <Button onClick={handleCreateCharacter} size="sm" variant="outline">
                    {character ? '重新编辑' : '开始建卡'}
                  </Button>
                </div>
                <div className="mt-4">
                  <CharacterCreator
                    key={script.id}
                    onComplete={handleCharacterComplete}
                    variant="compact"
                    openRequestId={openRequestId}
                    mode={editorMode}
                    initialFormState={editorFormState}
                    skillOptions={script.skillOptions}
                    equipmentOptions={script.equipmentOptions}
                    occupationOptions={script.occupationOptions}
                    originOptions={script.originOptions}
                    buffOptions={script.buffOptions}
                    debuffOptions={script.debuffOptions}
                    attributeRanges={script.attributeRanges}
                    attributePointBudget={script.attributePointBudget}
                    skillLimit={script.skillLimit}
                    equipmentLimit={script.equipmentLimit}
                    buffLimit={script.buffLimit}
                    debuffLimit={script.debuffLimit}
                    rules={script.rules}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={!character} onClick={handleStartLocalPlay} size="sm">
                    开始本地游玩
                  </Button>
                </div>
              </section>
              <CharacterCardPanel skillOptions={script.skillOptions} rules={script.rules} />
            </div>
          </TabsContent>

          <TabsContent className="min-h-0 overflow-auto pt-2" value="play">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:h-full">
              <section className="panel-card flex min-h-0 flex-col gap-4 p-3 sm:p-4 lg:h-full">
                <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                  <SceneMapPanel script={script} />
                  <div className={panelClassName}>
                    <p className={sectionTitleClassName}>本地状态</p>
                    <div className="mt-2 space-y-2 text-xs text-[var(--ink-muted)]">
                      <p>当前场景：{memory?.presence.scene ?? '未开始'}</p>
                      <p>当前位置：{memory?.presence.location ?? '未开始'}</p>
                      <p>在场 NPC：{memory?.presence.presentNpcs.join('、') || '无'}</p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pt-2" ref={messageListRef}>
                  {hasMessages ? (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          className={`flex flex-col gap-2 ${message.role === 'player' ? 'items-end' : 'items-start'}`}
                          key={message.id}
                        >
                          <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                            <span className="rounded-lg bg-[var(--accent-river)] px-2 py-0.5 text-[10px] text-white">
                              {message.speaker}
                            </span>
                            <span>{message.time}</span>
                          </div>
                          <div className="max-w-full rounded-xl bg-[rgba(255,255,255,0.78)] px-4 py-3 text-sm text-[var(--ink-strong)] sm:max-w-[85%]">
                            {message.modules && message.modules.length > 0 ? (
                              renderModules(message.modules)
                            ) : (
                              <p className="whitespace-pre-line">{message.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] text-sm text-[var(--ink-soft)]">
                      先创建角色并开始本地游玩。
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.6)] p-3 sm:p-4">
                  <div className="flex flex-wrap gap-2">
                    {['观察周围', '调查现场', '说服目击者', '潜行接近入口'].map((action) => (
                      <Button key={action} onClick={() => setInputText(action)} size="xs" variant="outline">
                        {action}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-3">
                    <Label className="text-xs text-[var(--ink-muted)]">输入行动</Label>
                    <Textarea
                      rows={4}
                      placeholder="例如：我先观察铁门附近的脚印，再贴门听里面有没有声音。"
                      value={inputText}
                      onChange={(event) => setInputText(event.target.value)}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-[var(--ink-soft)]">
                        本地 runner 会优先做基础检定和叙事 fallback，不调用正式 AI API。
                      </p>
                      <div className="flex gap-2">
                        <Button disabled={!canPlay} onClick={handleStartLocalPlay} size="sm" variant="outline">
                          重开本地局
                        </Button>
                        <Button disabled={!canPlay || !inputText.trim()} onClick={handleSend} size="sm">
                          发送行动
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <CharacterCardPanel skillOptions={script.skillOptions} rules={script.rules} />
            </div>
          </TabsContent>

          <TabsContent className="min-h-0 overflow-auto pt-2" value="export">
            <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
              <aside className="space-y-3">
                <div className={panelClassName}>
                  <p className={sectionTitleClassName}>导出选项</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button onClick={handleExportMarkdown} size="sm">
                      <DownloadIcon />
                      导出 Markdown
                    </Button>
                    <Button onClick={handleExportJson} size="sm" variant="outline">
                      <DownloadIcon />
                      导出 JSON
                    </Button>
                    <Button onClick={handleCopyMarkdown} size="sm" variant="outline">
                      <SaveIcon />
                      复制 Markdown
                    </Button>
                  </div>
                </div>
                <div className={panelClassName}>
                  <p className={sectionTitleClassName}>当前摘要</p>
                  <div className="mt-2 space-y-2 text-xs text-[var(--ink-muted)]">
                    <p>消息数：{messages.length}</p>
                    <p>角色：{character ? `${character.name} / ${character.occupation}` : '未创建'}</p>
                    <p>最后场景：{memory?.presence.scene ?? '未开始'}</p>
                  </div>
                </div>
              </aside>
              <section className={panelClassName}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={sectionTitleClassName}>Markdown 预览</p>
                    <h3 className="text-lg font-semibold text-[var(--ink-strong)]">可直接沉淀为测试战报</h3>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-xs text-[var(--ink-muted)]">战报内容</Label>
                  <Textarea className="mt-2 font-mono text-xs" rows={24} value={latestMarkdown} readOnly />
                </div>
              </section>
            </div>
          </TabsContent>
        </Tabs>

        {statusMessage ? <p className="text-xs text-[var(--ink-soft)]">{statusMessage}</p> : null}
      </main>

      <aside className="space-y-4 lg:overflow-auto">
        <div className="panel-card flex flex-col gap-3 p-4">
          <div>
            <p className={sectionTitleClassName}>离线说明</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">当前模式能力边界</h3>
          </div>
          <div className="space-y-2 text-xs text-[var(--ink-muted)]">
            <p>- 会复用现有剧本结构、建卡限制、掷骰执行器。</p>
            <p>- 不会调用登录、数据库、正式 `/api/chat`。</p>
            <p>- 当前叙事是本地 fallback，重点是把闭环跑通并可导出。</p>
          </div>
        </div>

        <div className="panel-card flex flex-col gap-3 p-4">
          <div>
            <p className={sectionTitleClassName}>风险建议</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">当前模组提示</h3>
          </div>
          <div className="space-y-3 text-xs text-[var(--ink-muted)]">
            {report.encounterRisks.length > 0 ? (
              report.encounterRisks.map((item: (typeof report.encounterRisks)[number]) => (
                <div
                  className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3"
                  key={item.encounterId}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[var(--ink-strong)]">{item.title}</p>
                    <Badge
                      variant={item.overallRisk === 'high' || item.overallRisk === 'deadly' ? 'warning' : 'secondary'}
                    >
                      {item.overallRisk}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    {item.warnings.slice(0, 2).map((warning) => (
                      <p key={warning}>- {warning}</p>
                    ))}
                    {item.suggestions.slice(0, 1).map((suggestion) => (
                      <p key={suggestion}>建议：{suggestion}</p>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p>当前遭遇尚未形成可用风险报告。</p>
            )}
          </div>
        </div>

        <div className="panel-card flex flex-col gap-3 p-4">
          <div>
            <p className={sectionTitleClassName}>当前角色</p>
            <h3 className="text-lg font-semibold text-[var(--ink-strong)]">本地存档摘要</h3>
          </div>
          <div className="space-y-2 text-xs text-[var(--ink-muted)]">
            <p>剧本：{script.title}</p>
            <p>角色：{character ? `${character.name} / ${character.occupation}` : '未创建'}</p>
            <p>消息：{messages.length}</p>
            <p>地图：{memory?.presence.location ?? '未开始'}</p>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        isOpen={isResetOpen}
        title="重置本地闭环数据"
        description="会清空本地模组草稿、人物卡、游玩记录和导出会话。"
        confirmLabel="确认重置"
        onCancel={() => setIsResetOpen(false)}
        onConfirm={handleResetAll}
      />
    </div>
  );
}

export default function LocalPlayPage() {
  const selectedScriptId = useGameStore((state) => state.selectedScriptId);
  const activeGameId = useGameStore((state) => state.activeGameId);

  return (
    <AppShell activeNav="script" scriptId={selectedScriptId} gameId={activeGameId}>
      <LocalPlayContent />
    </AppShell>
  );
}
