import { notFound, redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { ChatPanel } from '@/components/chat-panel';
import { getRequestSession } from '@/lib/auth/session';
import { getRuntimeConfig } from '@/lib/config/runtime';
import { getGameContext } from '@/lib/game/runtime';
import type { GameContext } from '@/lib/game/types';

type GamePageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login');
  }

  const { id } = await params;
  let gameContext: GameContext;
  try {
    gameContext = await getGameContext(id, session.userId);
  } catch (error) {
    if (error instanceof Error && error.message === '游戏不存在') {
      notFound();
    }
    throw error;
  }

  const { gameRuntimeMode } = getRuntimeConfig();

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">当前模组</p>
          <h1 className="text-3xl font-semibold text-zinc-950">{gameContext.module?.title || '未知模组'}</h1>
          <p className="text-sm text-zinc-600">{gameContext.module?.summary || '暂无模组摘要'}</p>
        </div>
        <div className="space-y-2 rounded-xl bg-zinc-100 p-4">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">人物卡</p>
          <p className="text-xl font-medium text-zinc-950">{gameContext.character?.name || '未知角色'}</p>
          <p className="text-sm leading-7 text-zinc-700">{gameContext.character?.summary || '暂无人物卡摘要'}</p>
        </div>
        <div className="space-y-2 rounded-xl bg-zinc-950 p-4 text-sm leading-7 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">运行时</p>
          <p>gameId: {gameContext.game.id}</p>
          <p>workspace: {gameContext.game.workspacePath}</p>
          <p>mode: {gameRuntimeMode}</p>
        </div>
      </Card>
      <Card>
        <ChatPanel
          gameId={gameContext.game.id}
          initialBalance={session.balance}
          initialMessages={gameContext.messages}
        />
      </Card>
    </div>
  );
}
