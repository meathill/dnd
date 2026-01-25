import GamePage from './game-page';

type PageProps = {
  params: { id: string };
};

export default function GameDetailPage({ params }: PageProps) {
  return <GamePage gameId={params.id} />;
}
