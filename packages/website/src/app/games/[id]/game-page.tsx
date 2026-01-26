'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../app-shell';
import GameStage from '../../game-stage';
import type {
  CharacterRecord,
  ChatMessage,
  GameMessageRecord,
  GameRecord,
  ScriptDefinition,
} from '../../../lib/game/types';
import { useGameStore } from '../../../lib/game/game-store';

type GamePageProps = {
  gameId: string;
};

type GameFetchResponse = {
  game?: GameRecord;
  script?: ScriptDefinition;
  character?: CharacterRecord;
  messages?: GameMessageRecord[];
  error?: string;
};

function formatTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function GamePageContent({ gameId }: GamePageProps) {
  const router = useRouter();
  const selectScript = useGameStore((state) => state.selectScript);
  const setPhase = useGameStore((state) => state.setPhase);
  const setActiveGameId = useGameStore((state) => state.setActiveGameId);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const [script, setScript] = useState<ScriptDefinition | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadGame = useCallback(async () => {
    setIsLoading(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/games/${gameId}`, { cache: 'no-store' });
      const data = (await response.json()) as GameFetchResponse;
      if (!response.ok) {
        setScript(null);
        setStatusMessage(data.error ?? (response.status === 401 ? '请先登录后继续游戏。' : '游戏读取失败'));
        return;
      }
      if (!data.game || !data.script || !data.character) {
        setScript(null);
        setInitialMessages([]);
        setStatusMessage('游戏数据不完整，请重新进入。');
        return;
      }
      setScript(data.script);
      selectScript(data.script.id);
      setCharacter(data.character);
      setActiveGameId(data.game.id);
      const messages = (data.messages ?? []).map((message) => ({
        id: message.id,
        role: message.role,
        speaker: message.speaker,
        time: formatTime(message.createdAt),
        content: message.content,
        modules: message.modules,
      }));
      setInitialMessages(messages);
    } catch {
      setScript(null);
      setInitialMessages([]);
      setStatusMessage('游戏读取失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  }, [gameId, selectScript, setActiveGameId, setCharacter]);

  useEffect(() => {
    setPhase('game');
    setActiveGameId(gameId);
  }, [gameId, setActiveGameId, setPhase]);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  if (!script) {
    return (
      <div className="grid h-full gap-4 overflow-hidden p-4">
        <section className="panel-card flex h-full flex-col gap-3 rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">游戏</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">
            {isLoading ? '正在读取游戏...' : '无法进入游戏'}
          </h2>
          <p className="text-sm text-[var(--ink-muted)]">{statusMessage || '请返回首页重新选择游戏。'}</p>
          <button
            className="mt-auto rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-2 text-xs text-[var(--ink-muted)]"
            onClick={() => router.push('/')}
            type="button"
          >
            返回首页
          </button>
        </section>
      </div>
    );
  }

  return <GameStage script={script} initialMessages={initialMessages} />;
}

export default function GamePage({ gameId }: GamePageProps) {
  const selectedScriptId = useGameStore((state) => state.selectedScriptId);
  const activeGameId = useGameStore((state) => state.activeGameId);
  return (
    <AppShell activeNav="game" scriptId={selectedScriptId} gameId={activeGameId ?? gameId}>
      <GamePageContent gameId={gameId} />
    </AppShell>
  );
}
