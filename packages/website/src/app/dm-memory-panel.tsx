'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../lib/game/game-store';
import { useSession } from '../lib/session/session-context';
import type { CharacterRecord, GameMemoryRecord } from '../lib/game/types';
import { Button } from '../components/ui/button';
import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from '../components/ui/accordion';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';

type MemoryResponse = {
  memory?: GameMemoryRecord | null;
  character?: CharacterRecord | null;
  error?: string;
};

type SectionKey = 'shortSummary' | 'longSummary' | 'map' | 'recentRounds' | 'state';

const SECTION_OPTIONS: Array<{ id: SectionKey; label: string }> = [
  { id: 'shortSummary', label: '短摘要' },
  { id: 'longSummary', label: '长期摘要' },
  { id: 'map', label: '地图' },
  { id: 'recentRounds', label: '近期回合' },
  { id: 'state', label: '状态 JSON' },
];

const SECTION_KEY_SET = new Set<SectionKey>(SECTION_OPTIONS.map((item) => item.id));

function formatTime(value: string): string {
  if (!value) {
    return '无';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function DmMemoryPanel() {
  const { session } = useSession();
  const gameId = useGameStore((state) => state.activeGameId);
  const isRoot = session?.isRoot ?? false;
  const [memory, setMemory] = useState<GameMemoryRecord | null>(null);
  const [character, setCharacter] = useState<CharacterRecord | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visibleSections, setVisibleSections] = useState<Record<SectionKey, boolean>>({
    shortSummary: true,
    longSummary: true,
    map: true,
    recentRounds: true,
    state: true,
  });
  const [openSections, setOpenSections] = useState<SectionKey[]>(SECTION_OPTIONS.map((item) => item.id));

  const activeSections = useMemo(
    () => SECTION_OPTIONS.filter((section) => visibleSections[section.id]),
    [visibleSections],
  );

  const loadMemory = useCallback(async () => {
    if (!gameId || !isRoot) {
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/games/${gameId}/memory`, { cache: 'no-store' });
      const data = (await response.json()) as MemoryResponse;
      if (!response.ok) {
        setMessage(data.error ?? 'DM 记忆读取失败');
        setMemory(null);
        setCharacter(null);
        return;
      }
      setMemory(data.memory ?? null);
      setCharacter(data.character ?? null);
    } catch {
      setMessage('DM 记忆读取失败');
      setMemory(null);
      setCharacter(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, isRoot]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  if (!isRoot || !gameId) {
    return null;
  }

  function handleSectionToggle(section: SectionKey, checked: boolean) {
    setVisibleSections((prev) => ({ ...prev, [section]: checked }));
    setOpenSections((prev) => {
      if (!checked) {
        return prev.filter((item) => item !== section);
      }
      if (prev.includes(section)) {
        return prev;
      }
      return [...prev, section];
    });
  }

  function normalizeSectionKeys(value: Array<unknown | null>): SectionKey[] {
    return value.filter(
      (item): item is SectionKey => typeof item === 'string' && SECTION_KEY_SET.has(item as SectionKey),
    );
  }

  return (
    <section className="panel-card flex flex-col gap-3 rounded-lg max-h-80 overflow-auto">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">DM 调试</p>
          <h3 className="text-base font-semibold text-[var(--ink-strong)]">记忆面板</h3>
        </div>
        <Button size="xs" variant="outline" onClick={loadMemory} disabled={isLoading}>
          {isLoading ? '同步中...' : '刷新'}
        </Button>
      </div>
      {message ? <p className="text-xs text-[var(--accent-ember)]">{message}</p> : null}
      <div className="space-y-2 text-xs text-[var(--ink-soft)]">
        <div className="flex items-center justify-between">
          <span>角色</span>
          <span className="text-[var(--ink-strong)]">{character?.name ?? '无'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>最后回合</span>
          <span className="text-[var(--ink-strong)]">{memory?.lastRoundIndex ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>最后处理</span>
          <span className="text-[var(--ink-strong)]">{memory ? formatTime(memory.lastProcessedAt) : '无'}</span>
        </div>
      </div>
      <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">显示内容</p>
        <div className="mt-2 flex flex-wrap gap-3">
          {SECTION_OPTIONS.map((section) => {
            const id = `dm-memory-${section.id}`;
            return (
              <div className="flex items-center gap-2" key={section.id}>
                <Checkbox
                  id={id}
                  checked={visibleSections[section.id]}
                  onCheckedChange={(checked) => handleSectionToggle(section.id, checked === true)}
                />
                <Label htmlFor={id} className="text-xs font-normal text-[var(--ink-soft)]">
                  {section.label}
                </Label>
              </div>
            );
          })}
        </div>
      </div>
      <Accordion multiple value={openSections} onValueChange={(value) => setOpenSections(normalizeSectionKeys(value))}>
        {activeSections.map((section) => {
          switch (section.id) {
            case 'shortSummary':
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-[var(--ink-soft)]">短摘要</AccordionTrigger>
                  <AccordionPanel>
                    <p className="text-sm whitespace-pre-wrap text-[var(--ink-strong)]">
                      {memory?.shortSummary?.trim() || '无'}
                    </p>
                  </AccordionPanel>
                </AccordionItem>
              );
            case 'longSummary':
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-[var(--ink-soft)]">长期摘要</AccordionTrigger>
                  <AccordionPanel>
                    <p className="text-sm whitespace-pre-wrap text-[var(--ink-strong)]">
                      {memory?.longSummary?.trim() || '无'}
                    </p>
                  </AccordionPanel>
                </AccordionItem>
              );
            case 'map':
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-[var(--ink-soft)]">地图（ASCII）</AccordionTrigger>
                  <AccordionPanel>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 font-mono text-[11px] text-[var(--ink-strong)]">
                      {memory?.state?.mapText?.trim() || '无'}
                    </pre>
                  </AccordionPanel>
                </AccordionItem>
              );
            case 'recentRounds':
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-[var(--ink-soft)]">近期回合</AccordionTrigger>
                  <AccordionPanel>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 font-mono text-[11px] text-[var(--ink-strong)]">
                      {memory?.recentRounds?.length
                        ? memory.recentRounds.map((round) => `回合 ${round.round}：${round.summary}`).join('\n')
                        : '无'}
                    </pre>
                  </AccordionPanel>
                </AccordionItem>
              );
            case 'state':
              return (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-[var(--ink-soft)]">状态 JSON</AccordionTrigger>
                  <AccordionPanel>
                    <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 font-mono text-[11px] text-[var(--ink-strong)]">
                      {memory?.state ? JSON.stringify(memory.state, null, 2) : '无'}
                    </pre>
                  </AccordionPanel>
                </AccordionItem>
              );
            default:
              return null;
          }
        })}
      </Accordion>
    </section>
  );
}
