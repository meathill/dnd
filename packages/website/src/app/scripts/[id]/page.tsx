import ScriptDetailPage from './script-detail-page';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptPage({ params }: PageProps) {
  const { id } = await params;
  return <ScriptDetailPage scriptId={id} />;
}
