import GamePage from './game-page';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GameDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <GamePage gameId={id} />;
}
