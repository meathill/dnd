import { notFound, redirect } from 'next/navigation';
import { GameEntryCard } from '@/components/game-entry-card';
import { getRequestSession } from '@/lib/auth/session';
import { buildGameHref, buildWebsiteGameUrl } from '@/lib/config/runtime';
import { getCharacterById, getGameByIdForUser, getModuleById } from '@/lib/db/repositories';

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
  const gameHref = buildGameHref(game.id);
  const websiteGameUrl = buildWebsiteGameUrl(game.id);
  if (gameHref !== websiteGameUrl) {
    redirect(gameHref);
  }

  const [moduleRecord, characterRecord] = await Promise.all([
    getModuleById(game.moduleId),
    getCharacterById(game.characterId),
  ]);
  if (!moduleRecord || !characterRecord) {
    notFound();
  }

  return <GameEntryCard characterRecord={characterRecord} game={game} moduleRecord={moduleRecord} />;
}
