'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../app-shell';
import CharacterCreator from '../../character-creator';
import ScriptDetailStage from '../../script-detail-stage';
import ConfirmDialog from '../../confirm-dialog';
import { Button } from '../../../components/ui/button';
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

type CharacterOption = CharacterRecord & { isUsed: boolean; gameId: string | null };

type CharacterListResponse = {
  characters?: CharacterOption[];
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
  const [characterOptions, setCharacterOptions] = useState<CharacterOption[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | 'copy'>('create');
  const [editorTargetId, setEditorTargetId] = useState<string | null>(null);
  const [editorFormState, setEditorFormState] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CharacterOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setCharacterOptions([]);
    setSelectedCharacterId(null);
    setCharacter(null);
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

  const fetchCharacters = useCallback(async () => {
    if (!script || !session) {
      setCharacterOptions([]);
      setSelectedCharacterId(null);
      setCharacter(null);
      return;
    }
    try {
      const response = await fetch(`/api/characters?scriptId=${script.id}`, { cache: 'no-store' });
      const data = (await response.json()) as CharacterListResponse;
      if (!response.ok) {
        setCharacterOptions([]);
        setSelectedCharacterId(null);
        setCharacter(null);
        setStatusMessage(data.error ?? '人物卡读取失败');
        return;
      }
      const list = data.characters ?? [];
      setCharacterOptions(list);
      const currentSelected = selectedCharacterId;
      const stillExists = currentSelected ? list.some((item) => item.id === currentSelected) : false;
      const storedId = useGameStore.getState().character?.id ?? null;
      const nextSelectedId = stillExists
        ? currentSelected
        : storedId && list.some((item) => item.id === storedId)
          ? storedId
          : null;
      setSelectedCharacterId(nextSelectedId);
      const nextRecord = list.find((item) => item.id === nextSelectedId);
      setCharacter(nextRecord ?? null);
    } catch {
      setCharacterOptions([]);
      setSelectedCharacterId(null);
      setCharacter(null);
      setStatusMessage('人物卡读取失败，请稍后重试。');
    }
  }, [script, session, selectedCharacterId, setCharacter]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  function handleBackToHome() {
    router.push('/');
  }

  function handleRequestCharacterOpen() {
    requestAuth(() => {
      setEditorMode('create');
      setEditorTargetId(null);
      setEditorFormState(null);
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
    setStatusMessage(editorMode === 'edit' ? '正在更新人物卡...' : '正在保存人物卡...');
    try {
      const payload = { ...formState, scriptId: script.id };
      const response = await fetch(
        editorMode === 'edit' && editorTargetId ? `/api/characters/${editorTargetId}` : '/api/characters',
        {
          method: editorMode === 'edit' && editorTargetId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
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
      const nextCharacter = { ...data.character, isUsed: false, gameId: null };
      setCharacter(nextCharacter);
      setCharacterOptions((current) => [nextCharacter, ...current.filter((item) => item.id !== data.character.id)]);
      setSelectedCharacterId(data.character.id);
      setEditorMode('create');
      setEditorTargetId(null);
      setEditorFormState(null);
      setStatusMessage(editorMode === 'edit' ? '人物卡已更新。' : '人物卡已保存，可以开始游戏。');
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '人物卡保存失败';
      setStatusMessage(message);
      return { ok: false, message };
    }
  }

  async function handleStartGame() {
    if (!script || !character) {
      setStatusMessage('请先创建或选择人物卡。');
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

  const displayMessage = statusMessage || (!session ? '请先登录后创建人物卡。' : '');

  function buildFormStateFromCharacter(target: CharacterRecord): FormState {
    return {
      name: target.name,
      occupation: target.occupation,
      age: target.age,
      origin: target.origin,
      appearance: target.appearance,
      background: target.background,
      motivation: target.motivation,
      avatar: target.avatar,
      luck: target.luck,
      attributes: { ...target.attributes },
      skills: { ...(target.skills as Record<string, number>) },
      inventory: target.inventory.join('、'),
      buffs: [...target.buffs],
      debuffs: [...target.debuffs],
      note: target.note,
    };
  }

  function handleSelectCharacter(characterId: string) {
    const selected = characterOptions.find((option) => option.id === characterId);
    if (!selected) {
      return;
    }
    setSelectedCharacterId(characterId);
    setCharacter(selected);
    setStatusMessage('');
  }

  function handleEditCharacter(characterId: string) {
    const target = characterOptions.find((option) => option.id === characterId);
    if (!target) {
      return;
    }
    setEditorMode('edit');
    setEditorTargetId(target.id);
    setEditorFormState(buildFormStateFromCharacter(target));
    setOpenRequestId((value) => value + 1);
  }

  function handleCopyCharacter(characterId: string) {
    const target = characterOptions.find((option) => option.id === characterId);
    if (!target) {
      return;
    }
    const seed = buildFormStateFromCharacter(target);
    setEditorMode('copy');
    setEditorTargetId(null);
    setEditorFormState({
      ...seed,
      name: seed.name ? `${seed.name}（副本）` : seed.name,
    });
    setOpenRequestId((value) => value + 1);
  }

  async function handleDeleteCharacter(characterId: string) {
    const target = characterOptions.find((option) => option.id === characterId);
    if (!target) {
      return;
    }
    setDeleteTarget(target);
  }

  function handleCancelDeleteCharacter() {
    setDeleteTarget(null);
  }

  async function handleConfirmDeleteCharacter() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/characters/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '人物卡删除失败');
      }
      if (selectedCharacterId === deleteTarget.id) {
        setSelectedCharacterId(null);
        setCharacter(null);
      }
      await fetchCharacters();
      setStatusMessage('人物卡已删除。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '人物卡删除失败';
      setStatusMessage(message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  if (!script) {
    return (
      <div className="grid h-full gap-4 overflow-hidden p-4">
        <section className="panel-card flex h-full flex-col gap-3 rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">剧本</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
            {isLoading ? '正在读取剧本...' : '无法进入剧本'}
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">{statusMessage || '请返回首页重新选择剧本。'}</p>
          <Button className="mt-auto" onClick={handleBackToHome} size="sm" variant="outline">
            返回首页
          </Button>
        </section>
      </div>
    );
  }

  return (
    <ScriptDetailStage
      script={script}
      onBack={handleBackToHome}
      onStartGame={handleStartGame}
      onSelectCharacter={handleSelectCharacter}
      onEditCharacter={handleEditCharacter}
      onCopyCharacter={handleCopyCharacter}
      onDeleteCharacter={handleDeleteCharacter}
      characterOptions={characterOptions}
      selectedCharacterId={selectedCharacterId}
      isLoggedIn={Boolean(session)}
      isStarting={isStarting}
      statusMessage={displayMessage}
    >
      <CharacterCreator
        key={script.id}
        onComplete={handleCharacterComplete}
        variant="compact"
        openRequestId={openRequestId}
        mode={editorMode}
        initialFormState={editorFormState ?? undefined}
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
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="删除人物卡"
        description={deleteTarget ? `确定要删除「${deleteTarget.name}」吗？` : ''}
        confirmLabel="删除人物卡"
        isProcessing={isDeleting}
        onCancel={handleCancelDeleteCharacter}
        onConfirm={handleConfirmDeleteCharacter}
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
