'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import CharacterCreator from './character-creator';
import GameStage from './game-stage';
import HomeStage from './home-stage';
import ScriptDetailStage from './script-detail-stage';
import SettingsModal from './settings-modal';
import type { FormState, SubmitResult } from './character-creator-data';
import type {
  CharacterFieldErrors,
  CharacterRecord,
  GameRecord,
  GameRecordSummary,
  ScriptDefinition,
} from '../lib/game/types';
import { SAMPLE_SCRIPT } from '../lib/game/sample-script';
import { resolveAttributePointBudget, resolveAttributeRanges } from '../lib/game/rules';
import type { SessionInfo, UserSettings } from '../lib/session/session-types';

const sidebarTitleClassName = 'text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]';

const defaultSettings: UserSettings = {
  provider: 'openai',
  model: '',
};

type Phase = 'home' | 'script' | 'game';

function buildNavItemClass(isActive: boolean, isDisabled: boolean): string {
  if (isDisabled) {
    return 'w-full rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.5)] px-3 py-2 text-left text-xs text-[var(--ink-soft)]';
  }
  return `w-full rounded-lg px-3 py-2 text-left text-sm transition ${
    isActive
      ? 'bg-[var(--accent-brass)] text-white'
      : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-muted)] hover:border-[var(--accent-brass)]'
  }`;
}

export default function GameShell() {
  const [phase, setPhase] = useState<Phase>('home');
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [games, setGames] = useState<GameRecordSummary[]>([]);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterRecord | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [homeMessage, setHomeMessage] = useState('');
  const [detailMessage, setDetailMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [openRequestId, setOpenRequestId] = useState(0);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<UserSettings>(defaultSettings);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const selectedScript = useMemo(
    () => scripts.find((script) => script.id === selectedScriptId) ?? null,
    [scripts, selectedScriptId],
  );

  const canStart = Boolean(selectedScript && character);
  const isLoggedIn = Boolean(session);

  const effectiveAttributeRanges = useMemo(
    () => (selectedScript ? resolveAttributeRanges(selectedScript.attributeRanges) : undefined),
    [selectedScript],
  );
  const effectiveAttributePointBudget = useMemo(
    () => (selectedScript ? resolveAttributePointBudget(selectedScript.attributePointBudget) : undefined),
    [selectedScript],
  );

  const loadScripts = useCallback(async () => {
    try {
      const response = await fetch('/api/scripts', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('脚本列表获取失败');
      }
      const data = (await response.json()) as { scripts?: ScriptDefinition[] };
      const list = data.scripts ?? [];
      setScripts(list.length > 0 ? list : [SAMPLE_SCRIPT]);
      setScriptsLoaded(true);
      if (list.length === 0) {
        setHomeMessage('脚本列表为空，暂时使用示例剧本。请先执行数据库迁移导入剧本。');
      }
    } catch {
      setScripts([SAMPLE_SCRIPT]);
      setScriptsLoaded(true);
      setHomeMessage('无法读取脚本列表，暂时使用示例剧本。请检查数据库。');
    }
  }, []);

  const loadGames = useCallback(async () => {
    try {
      const response = await fetch('/api/games', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('游戏记录获取失败');
      }
      const data = (await response.json()) as { games?: GameRecordSummary[] };
      setGames(data.games ?? []);
      setGamesLoaded(true);
    } catch {
      setGames([]);
      setGamesLoaded(true);
      setHomeMessage((prev) => (prev ? prev : '无法读取游戏记录，请稍后重试。'));
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { session?: SessionInfo | null };
      setSession(data.session ?? null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    loadScripts();
    loadGames();
    loadSession();
  }, [loadGames, loadScripts, loadSession]);

  function handleSelectScript(scriptId: string) {
    setSelectedScriptId(scriptId);
    setPhase('script');
    setDetailMessage('');
    if (character && character.scriptId !== scriptId) {
      setCharacter(null);
      setDetailMessage('已切换剧本，请重新创建人物卡。');
    }
  }

  function handleBackToHome() {
    setPhase('home');
    setDetailMessage('');
  }

  function handleContinueGame(gameId: string) {
    const game = games.find((item) => item.id === gameId) ?? null;
    if (game) {
      setSelectedScriptId(game.scriptId);
    }
    setActiveGameId(gameId);
    setPhase('game');
  }

  function handleEditCharacter() {
    setOpenRequestId((value) => value + 1);
  }

  async function handleCharacterComplete(formState: FormState): Promise<SubmitResult> {
    if (!selectedScriptId) {
      setDetailMessage('请先选择剧本。');
      return { ok: false, message: '请先选择剧本。' };
    }
    setDetailMessage('正在保存人物卡...');
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
        setDetailMessage(message);
        return { ok: false, fieldErrors: data.fieldErrors, message };
      }
      setCharacter(data.character);
      setDetailMessage('人物卡已保存，可以开始游戏。');
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : '人物卡保存失败';
      setDetailMessage(message);
      return { ok: false, message };
    }
  }

  async function handleStartGame() {
    if (!selectedScriptId || !character) {
      setDetailMessage('请先选择剧本并创建人物卡。');
      return;
    }
    setIsStarting(true);
    setDetailMessage('正在创建游戏...');
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
      setActiveGameId(data.game.id);
      setPhase('game');
      setDetailMessage('');
      await loadGames();
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建游戏失败';
      setDetailMessage(message);
    } finally {
      setIsStarting(false);
    }
  }

  function handleOpenSettings() {
    if (!session) {
      return;
    }
    setSettingsDraft(session.settings ?? defaultSettings);
    setSettingsMessage('');
    setIsSettingsOpen(true);
  }

  function handleCloseSettings() {
    setIsSettingsOpen(false);
  }

  async function handleSaveSettings() {
    if (!session) {
      setSettingsMessage('未登录无法保存设置。');
      return;
    }
    setIsSavingSettings(true);
    setSettingsMessage('');
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft),
      });
      const data = (await response.json()) as { settings?: UserSettings; error?: string };
      if (!response.ok || !data.settings) {
        throw new Error(data.error ?? '保存设置失败');
      }
      setSession((current) => (current ? { ...current, settings: data.settings ?? null } : current));
      setIsSettingsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存设置失败';
      setSettingsMessage(message);
    } finally {
      setIsSavingSettings(false);
    }
  }

  const characterSummary = character ? { name: character.name, occupation: character.occupation } : null;

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden grid grid-cols-[15rem_minmax(0,1fr)]">
      <aside
        className="panel-card animate-[fade-up_0.7s_ease-out_both] flex w-full flex-col gap-4 p-4 lg:h-full lg:overflow-hidden"
        style={{ animationDelay: '0.05s' }}
      >
        <div className="space-y-3">
          <p className={sidebarTitleClassName}>AI 跑团体验 · COC 模式</p>
          <h1 className="text-3xl text-[var(--ink-strong)] sm:text-4xl font-[var(--font-accent)]">肉团长</h1>
          <p className="text-sm text-[var(--ink-muted)]">导航与账号入口，随时切换不同阶段。</p>
        </div>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">导航</p>
          <button className={buildNavItemClass(phase === 'home', false)} onClick={() => setPhase('home')} type="button">
            首页
          </button>
          <button
            className={buildNavItemClass(phase === 'script', !selectedScript)}
            disabled={!selectedScript}
            onClick={() => selectedScript && setPhase('script')}
            type="button"
          >
            剧本详情
          </button>
          <button
            className={buildNavItemClass(phase === 'game', !activeGameId)}
            disabled={!activeGameId}
            onClick={() => activeGameId && setPhase('game')}
            type="button"
          >
            游戏现场
          </button>
          <button
            className={buildNavItemClass(false, !isLoggedIn)}
            disabled={!isLoggedIn}
            onClick={handleOpenSettings}
            type="button"
          >
            设置
          </button>
        </div>

        <div className="mt-auto space-y-2 text-xs text-[var(--ink-soft)]">
          <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3">
            <p className="font-semibold text-[var(--ink-strong)]">账号状态</p>
            <p className="mt-2">{isLoggedIn ? `已登录：${session?.displayName}` : '未登录'}</p>
            <p className="mt-1">登录后可使用设置。</p>
          </div>
        </div>
      </aside>

      {phase === 'home' ? (
        <HomeStage
          scripts={scriptsLoaded ? scripts : [SAMPLE_SCRIPT]}
          games={gamesLoaded ? games : []}
          onSelectScript={handleSelectScript}
          onContinueGame={handleContinueGame}
          statusMessage={homeMessage}
        />
      ) : null}

      {phase === 'script' && selectedScript ? (
        <ScriptDetailStage
          script={selectedScript}
          characterSummary={characterSummary}
          onBack={handleBackToHome}
          onStartGame={handleStartGame}
          onEditCharacter={handleEditCharacter}
          isStarting={isStarting}
          statusMessage={detailMessage}
        >
          <CharacterCreator
            key={selectedScriptId ?? 'no-script'}
            onComplete={handleCharacterComplete}
            variant="compact"
            openRequestId={openRequestId}
            skillOptions={selectedScript.skillOptions}
            equipmentOptions={selectedScript.equipmentOptions}
            occupationOptions={selectedScript.occupationOptions}
            originOptions={selectedScript.originOptions}
            buffOptions={selectedScript.buffOptions}
            debuffOptions={selectedScript.debuffOptions}
            attributeRanges={effectiveAttributeRanges}
            attributePointBudget={effectiveAttributePointBudget}
            skillLimit={selectedScript.skillLimit}
            equipmentLimit={selectedScript.equipmentLimit}
            buffLimit={selectedScript.buffLimit}
            debuffLimit={selectedScript.debuffLimit}
          />
        </ScriptDetailStage>
      ) : null}

      {phase === 'game' ? <GameStage /> : null}

      <SettingsModal
        isOpen={isSettingsOpen}
        isSaving={isSavingSettings}
        settings={settingsDraft}
        message={settingsMessage}
        onClose={handleCloseSettings}
        onSave={handleSaveSettings}
        onSettingsChange={setSettingsDraft}
      />
    </div>
  );
}
