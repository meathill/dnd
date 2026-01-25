'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../app-shell';
import CharacterCreator from '../../character-creator';
import ScriptDetailStage from '../../script-detail-stage';
import type { CharacterFieldErrors, CharacterRecord, GameRecord, ScriptDefinition } from '../../../lib/game/types';
import { SAMPLE_SCRIPT } from '../../../lib/game/sample-script';
import { resolveAttributePointBudget, resolveAttributeRanges } from '../../../lib/game/rules';
import { useGameStore } from '../../../lib/game/game-store';
import { useSession } from '../../../lib/session/session-context';
import type { FormState, SubmitResult } from '../../character-creator-data';

type ScriptDetailPageProps = {
  scriptId: string;
};

type ScriptFetchResponse = {
  script?: ScriptDefinition;
  error?: string;
};

function ScriptDetailContent({ scriptId }: ScriptDetailPageProps) {
  const router = useRouter();
  const { session, requestAuth } = useSession();
  const selectScript = useGameStore((state) => state.selectScript);
  const setPhase = useGameStore((state) => state.setPhase);
  const setActiveGameId = useGameStore((state) => state.setActiveGameId);
  const character = useGameStore((state) => state.character);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const [script, setScript] = useState<ScriptDefinition | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [openRequestId, setOpenRequestId] = useState(0);

  const effectiveAttributeRanges = useMemo(
    () => (script ? resolveAttributeRanges(script.attributeRanges) : undefined),
    [script],
  );
  const effectiveAttributePointBudget = useMemo(
    () => (script ? resolveAttributePointBudget(script.attributePointBudget) : undefined),
    [script],
  );

  useEffect(() => {
    setPhase('script');
    setActiveGameId(null);
    selectScript(scriptId);
  }, [scriptId, selectScript, setActiveGameId, setPhase]);

  const loadScript = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/scripts/${scriptId}`, { cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 404 && scriptId === SAMPLE_SCRIPT.id) {
          setScript(SAMPLE_SCRIPT);
          setStatusMessage('脚本不存在，暂时使用示例剧本。');
          return;
        }
        const data = (await response.json()) as ScriptFetchResponse;
        setScript(null);
        setStatusMessage(data.error ?? (response.status === 404 ? '剧本不存在' : '剧本读取失败'));
        return;
      }
      const data = (await response.json()) as ScriptFetchResponse;
      setScript(data.script ?? null);
    } catch {
      if (scriptId === SAMPLE_SCRIPT.id) {
        setScript(SAMPLE_SCRIPT);
        setStatusMessage('无法读取剧本，暂时使用示例剧本。');
      } else {
        setScript(null);
        setStatusMessage('无法读取剧本，请稍后重试。');
      }
    } finally {
      setIsLoading(false);
    }
  }, [scriptId]);

  useEffect(() => {
    loadScript();
  }, [loadScript]);

  function handleBackToHome() {
    router.push('/');
  }

  function handleEditCharacter() {
    setOpenRequestId((value) => value + 1);
  }

  function handleRequestCharacterOpen() {
    requestAuth(() => {
      setOpenRequestId((value) => value + 1);
    });
  }

  async function handleCharacterComplete(formState: FormState): Promise<SubmitResult> {
    if (!script) {
      setStatusMessage('剧本尚未加载完成。');
      return { ok: false, message: '剧本尚未加载完成。' };
    }
    if (!session) {
      setStatusMessage('请先登录后创建人物卡。');
      return { ok: false, message: '请先登录后创建人物卡。' };
    }
    setStatusMessage('正在保存人物卡...');
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formState, scriptId: script.id }),
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
      setStatusMessage('人物卡已保存，可以开始游戏。');
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '人物卡保存失败';
      setStatusMessage(message);
      return { ok: false, message };
    }
  }

  async function handleStartGame() {
    if (!script || !character) {
      setStatusMessage('请先选择剧本并创建人物卡。');
      return;
    }
    if (!session) {
      setStatusMessage('请先登录后开始游戏。');
      return;
    }
    setIsStarting(true);
    setStatusMessage('正在创建游戏...');
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: script.id, characterId: character.id }),
      });
      const data = (await response.json()) as { game?: GameRecord; error?: string };
      if (!response.ok || !data.game) {
        throw new Error(data.error ?? '创建游戏失败');
      }
      setActiveGameId(data.game.id);
      setPhase('game');
      setStatusMessage('');
      router.push(`/games/${data.game.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建游戏失败';
      setStatusMessage(message);
    } finally {
      setIsStarting(false);
    }
  }

  const characterSummary = character ? { name: character.name, occupation: character.occupation } : null;
  const displayMessage = statusMessage || (!session ? '请先登录后创建人物卡。' : '');

  if (!script) {
    return (
      <div className="grid h-full gap-4 overflow-hidden p-4">
        <section className="panel-card flex h-full flex-col gap-3 rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">剧本</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
            {isLoading ? '正在读取剧本...' : '无法进入剧本'}
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">{statusMessage || '请返回首页重新选择剧本。'}</p>
          <button
            className="mt-auto rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-2 text-xs text-[var(--ink-muted)]"
            onClick={handleBackToHome}
            type="button"
          >
            返回首页
          </button>
        </section>
      </div>
    );
  }

  return (
    <ScriptDetailStage
      script={script}
      characterSummary={characterSummary}
      onBack={handleBackToHome}
      onStartGame={handleStartGame}
      onEditCharacter={handleEditCharacter}
      isStarting={isStarting}
      statusMessage={displayMessage}
    >
      <CharacterCreator
        key={script.id}
        onComplete={handleCharacterComplete}
        variant="compact"
        openRequestId={openRequestId}
        skillOptions={script.skillOptions}
        equipmentOptions={script.equipmentOptions}
        occupationOptions={script.occupationOptions}
        originOptions={script.originOptions}
        buffOptions={script.buffOptions}
        debuffOptions={script.debuffOptions}
        attributeRanges={effectiveAttributeRanges}
        attributePointBudget={effectiveAttributePointBudget}
        skillLimit={script.skillLimit}
        equipmentLimit={script.equipmentLimit}
        buffLimit={script.buffLimit}
        debuffLimit={script.debuffLimit}
        isDisabled={!session}
        onRequestOpen={handleRequestCharacterOpen}
      />
    </ScriptDetailStage>
  );
}

export default function ScriptDetailPage({ scriptId }: ScriptDetailPageProps) {
  const selectedScriptId = useGameStore((state) => state.selectedScriptId);
  const activeGameId = useGameStore((state) => state.activeGameId);
  return (
    <AppShell activeNav="script" scriptId={selectedScriptId ?? scriptId} gameId={activeGameId}>
      <ScriptDetailContent scriptId={scriptId} />
    </AppShell>
  );
}
