'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from './app-shell';
import HomeStage from './home-stage';
import { SAMPLE_SCRIPT } from '../lib/game/sample-script';
import type { ScriptDefinition } from '../lib/game/types';
import { useGameStore } from '../lib/game/game-store';

export function HomeContent() {
  const router = useRouter();
  const setPhase = useGameStore((state) => state.setPhase);
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [homeMessage, setHomeMessage] = useState('');

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

  useEffect(() => {
    setPhase('home');
  }, [setPhase]);

  useEffect(() => {
    loadScripts();
  }, [loadScripts]);

  function handleSelectScript(scriptId: string) {
    router.push(`/scripts/${scriptId}`);
  }

  return (
    <HomeStage
      scripts={scriptsLoaded ? scripts : [SAMPLE_SCRIPT]}
      onSelectScript={handleSelectScript}
      statusMessage={homeMessage}
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
