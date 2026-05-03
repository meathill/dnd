import { notFound, redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { ChatPanel } from '@/components/chat-panel';
import { getRequestSession } from '@/lib/auth/session';
import { getCharacterById, getGameByIdForUser, getModuleById, listMessagesByGameId } from '@/lib/db/repositories';

type GamePageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: GamePageProps) {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login');
  }
  const { id } = await params;
  const game = await getGameByIdForUser(id, session.userId);
  if (!game) {
    notFound();
  }
  const [moduleRecord, characterRecord, messages] = await Promise.all([
    getModuleById(game.moduleId),
    getCharacterById(game.characterId),
    listMessagesByGameId(game.id),
  ]);
  if (!moduleRecord || !characterRecord) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">当前模组</p>
          <h1 className="text-3xl font-semibold text-zinc-950">{moduleRecord.title}</h1>
          <p className="text-sm text-zinc-600">{moduleRecord.summary}</p>
        </div>
        <div className="space-y-2 rounded-xl bg-zinc-100 p-4">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">人物卡</p>
          <p className="text-xl font-medium text-zinc-950">{characterRecord.name}</p>
          <p className="text-sm leading-7 text-zinc-700">{characterRecord.summary}</p>
        </div>
        <div className="rounded-xl bg-zinc-950 p-4 text-sm leading-7 text-white">
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-400">opencode session</p>
          <p>{game.opencodeSessionId}</p>
          <p className="mt-3 break-all text-zinc-300">{game.workspacePath}</p>
        </div>
      </Card>
      <Card>
        <ChatPanel gameId={game.id} initialBalance={session.balance} initialMessages={messages} />
      </Card>
    </div>
  );
}
