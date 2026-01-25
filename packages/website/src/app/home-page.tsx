'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from './app-shell';
import HomeStage from './home-stage';
import { SAMPLE_SCRIPT } from '../lib/game/sample-script';
import type { GameRecordSummary, ScriptDefinition } from '../lib/game/types';
import { useGameStore } from '../lib/game/game-store';
import { useSession } from '../lib/session/session-context';

export function HomeContent() {
  const router = useRouter();
  const { session } = useSession();
  const setPhase = useGameStore((state) => state.setPhase);
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [games, setGames] = useState<GameRecordSummary[]>([]);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [gamesLoaded, setGamesLoaded] = useState(false);
  const [homeMessage, setHomeMessage] = useState('');
  const [gamesMessage, setGamesMessage] = useState('');

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
    if (!session) {
      setGames([]);
      setGamesLoaded(true);
      setGamesMessage('登录后可查看游戏记录。');
      return;
    }
    try {
      setGamesMessage('');
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
      setGamesMessage((prev) => (prev ? prev : '无法读取游戏记录，请稍后重试。'));
    }
  }, []);

  useEffect(() => {
    setPhase('home');
  }, [setPhase]);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  function handleSelectScript(scriptId: string) {
    router.push(`/scripts/${scriptId}`);
  }

  function handleContinueGame(gameId: string) {
    router.push(`/games/${gameId}`);
  }

  return (
    <HomeStage
      scripts={scriptsLoaded ? scripts : [SAMPLE_SCRIPT]}
      games={gamesLoaded ? games : []}
      onSelectScript={handleSelectScript}
      onContinueGame={handleContinueGame}
      statusMessage={homeMessage}
      gamesMessage={gamesMessage}
    />
  );
}

export default function HomePage() {
  const selectedScriptId = useGameStore((state) => state.selectedScriptId);
  const activeGameId = useGameStore((state) => state.activeGameId);

  return (
    <AppShell activeNav="home" scriptId={selectedScriptId} gameId={activeGameId}>
      <HomeContent />
    </AppShell>
  );
}
