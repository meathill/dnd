import ScriptEditorPage from './script-editor-page';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminScriptEditorPage({ params }: PageProps) {
  const { id } = await params;
  return <ScriptEditorPage scriptId={id} />;
}
