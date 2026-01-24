'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AiProviderPanel from './ai-provider-panel';
import GameStage from './game-stage';
import SetupStage from './setup-stage';
import type { FormState, SubmitResult } from './character-creator-data';
import type { CharacterFieldErrors, CharacterRecord, GameRecord, ScriptDefinition } from '../lib/game/types';
import { SAMPLE_SCRIPT } from '../lib/game/sample-script';

const sidebarTitleClassName = 'text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]';

export default function GameShell() {
  const [phase, setPhase] = useState<'setup' | 'game'>('setup');
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const selectedScript = useMemo(
    () => scripts.find((script) => script.id === selectedScriptId) ?? null,
    [scripts, selectedScriptId],
  );

  const canStart = Boolean(selectedScriptId && character);

  useEffect(() => {
    let cancelled = false;
    async function loadScripts() {
      try {
        const response = await fetch('/api/scripts', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('脚本列表获取失败');
        }
        const data = (await response.json()) as { scripts?: ScriptDefinition[] };
        const list = data.scripts ?? [];
        if (!cancelled) {
          setScripts(list.length > 0 ? list : [SAMPLE_SCRIPT]);
          setScriptsLoaded(true);
          if (list.length === 0) {
            setStatusMessage('脚本列表为空，暂时使用示例剧本。请先执行数据库迁移导入剧本。');
          }
        }
      } catch {
        if (!cancelled) {
          setScripts([SAMPLE_SCRIPT]);
          setScriptsLoaded(true);
          setStatusMessage('无法读取脚本列表，暂时使用示例剧本。请检查数据库。');
        }
      }
    }
    loadScripts();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectScript = useCallback((scriptId: string) => {
    setSelectedScriptId(scriptId);
    setStatusMessage('');
    setCharacter((current) => {
      if (current && current.scriptId !== scriptId) {
        setStatusMessage('已切换剧本，请重新创建人物卡。');
        return null;
      }
      return current;
    });
  }, []);

  const handleClearScript = useCallback(() => {
    setSelectedScriptId(null);
    setCharacter(null);
    setStatusMessage('');
  }, []);

  const handleCharacterComplete = useCallback(
    async (formState: FormState): Promise<SubmitResult> => {
      if (!selectedScriptId) {
        setStatusMessage('请先选择剧本。');
        return { ok: false, message: '请先选择剧本。' };
      }
      setStatusMessage('正在保存人物卡...');
      try {
        const response = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formState, scriptId: selectedScriptId }),
        });
        const data = (await response.json()) as {
          character?: CharacterRecord;
          error?: string;
          fieldErrors?: CharacterFieldErrors;
        };
        if (!response.ok || !data.character) {
          const message = data.error ?? '人物卡保存失败';
          setStatusMessage(message);
          return { ok: false, fieldErrors: data.fieldErrors, message };
        }
        setCharacter(data.character);
        setStatusMessage('人物卡已保存。请选择剧本并开始游戏。');
        return { ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : '人物卡保存失败';
        setStatusMessage(message);
        return { ok: false, message };
      }
    },
    [selectedScriptId],
  );

  const handleStartGame = useCallback(async () => {
    if (!selectedScriptId || !character) {
      setStatusMessage('请先选择剧本并创建人物卡。');
      return;
    }
    setIsStarting(true);
    setStatusMessage('正在创建游戏...');
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: selectedScriptId, characterId: character.id }),
      });
      const data = (await response.json()) as { game?: GameRecord; error?: string };
      if (!response.ok || !data.game) {
        throw new Error(data.error ?? '创建游戏失败');
      }
      setPhase('game');
      setStatusMessage('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建游戏失败';
      setStatusMessage(message);
    } finally {
      setIsStarting(false);
    }
  }, [selectedScriptId, character]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid grid-cols-[15rem_minmax(0,1fr)]">
      <aside
        className="panel-card animate-[fade-up_0.7s_ease-out_both] flex w-full flex-col gap-4 p-4 lg:h-full lg:overflow-hidden"
        style={{ animationDelay: '0.05s' }}
      >
        <div className="space-y-3">
          <p className={sidebarTitleClassName}>AI 跑团体验 · COC 模式</p>
          <h1 className="text-3xl text-[var(--ink-strong)] sm:text-4xl font-[var(--font-accent)]">肉团长</h1>
          <p className="text-sm text-[var(--ink-muted)]">游戏外控制台，管理房间、成员与模型设置，随时切回冒险现场。</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">游戏大厅</p>
          <button
            className="w-full rounded-xl bg-[var(--accent-brass)] px-4 py-2 text-sm text-white shadow-[0_12px_30px_-18px_var(--accent-brass)] transition hover:-translate-y-0.5"
            type="button"
          >
            创建游戏
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-xl border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[var(--ink-strong)]"
              disabled
              type="button"
            >
              登入
            </button>
            <button
              className="rounded-xl border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[var(--ink-strong)]"
              disabled
              type="button"
            >
              登出
            </button>
          </div>
          <button
            className="w-full rounded-xl border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[var(--ink-strong)]"
            disabled
            type="button"
          >
            设置
          </button>
          <p className="text-xs text-[var(--ink-soft)]">登入/登出/设置功能后续接入。</p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:overflow-y-auto lg:pr-2">
          <AiProviderPanel />

          <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4 text-xs text-[var(--ink-muted)]">
            <p className="font-semibold text-[var(--ink-strong)]">控制台状态</p>
            <p className="mt-2">房间：未创建 · 成员：0 · 版本：Alpha 预览</p>
          </div>
        </div>
      </aside>

      {phase === 'setup' ? (
        <SetupStage
          scripts={scriptsLoaded ? scripts : [SAMPLE_SCRIPT]}
          selectedScriptId={selectedScriptId}
          onSelectScript={handleSelectScript}
          onClearScript={handleClearScript}
          characterSummary={character ? { name: character.name, occupation: character.occupation } : null}
          onCharacterComplete={handleCharacterComplete}
          canStart={canStart}
          isStarting={isStarting}
          onStartGame={handleStartGame}
          statusMessage={statusMessage}
        />
      ) : (
        <GameStage />
      )}
    </div>
  );
}
