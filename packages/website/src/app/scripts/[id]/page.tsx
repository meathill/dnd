import ScriptDetailPage from './script-detail-page';

type PageProps = {
  params: { id: string };
};

export default function ScriptPage({ params }: PageProps) {
  return <ScriptDetailPage scriptId={params.id} />;
}
