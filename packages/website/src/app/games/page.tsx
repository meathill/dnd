'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../app-shell';
import ConfirmDialog from '../confirm-dialog';
import GamesStage from '../games-stage';
import type { GameRecordSummary } from '../../lib/game/types';
import { useGameStore } from '../../lib/game/game-store';
import { useSession } from '../../lib/session/session-context';

type GamesFetchResponse = {
  games?: GameRecordSummary[];
  error?: string;
};

function GamesContent() {
  const router = useRouter();
  const { session } = useSession();
  const setPhase = useGameStore((state) => state.setPhase);
  const setActiveGameId = useGameStore((state) => state.setActiveGameId);
  const [games, setGames] = useState<GameRecordSummary[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<GameRecordSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadGames = useCallback(async (): Promise<boolean> => {
    if (!session) {
      setGames([]);
      setStatusMessage('请先登录查看游戏记录。');
      setIsLoading(false);
      return false;
    }
    setIsLoading(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/games', { cache: 'no-store' });
      const data = (await response.json()) as GamesFetchResponse;
      if (!response.ok) {
        setGames([]);
        setStatusMessage(data.error ?? '游戏记录获取失败');
        return false;
      }
      setGames(data.games ?? []);
      return true;
    } catch {
      setGames([]);
      setStatusMessage('无法读取游戏记录，请稍后重试。');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    setPhase('home');
    setActiveGameId(null);
  }, [setActiveGameId, setPhase]);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  function handleOpenGame(gameId: string) {
    router.push(`/games/${gameId}`);
  }

  function handleDeleteGame(gameId: string) {
    const target = games.find((item) => item.id === gameId);
    if (!target) {
      return;
    }
    setDeleteTarget(target);
  }

  function handleCancelDelete() {
    setDeleteTarget(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/games/${deleteTarget.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '游戏记录删除失败');
      }
      const refreshed = await loadGames();
      if (refreshed) {
        setStatusMessage('游戏记录已删除。');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '游戏记录删除失败';
      setStatusMessage(message);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }

  const displayMessage = statusMessage || (isLoading ? '正在读取游戏记录...' : '');

  return (
    <>
      <GamesStage
        games={games}
        statusMessage={displayMessage}
        onOpenGame={handleOpenGame}
        onDeleteGame={handleDeleteGame}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="删除游戏记录"
        description={deleteTarget ? `确定要删除「${deleteTarget.scriptTitle}」的记录吗？` : ''}
        confirmLabel="删除记录"
        isProcessing={isDeleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

export default function GamesPage() {
  const selectedScriptId = useGameStore((state) => state.selectedScriptId);
  const activeGameId = useGameStore((state) => state.activeGameId);
  return (
    <AppShell activeNav="games" scriptId={selectedScriptId} gameId={activeGameId}>
      <GamesContent />
    </AppShell>
  );
}
