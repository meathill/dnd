import DmProfileEditorPage from './dm-profile-editor-page';

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDmProfileEditorPage({ params }: PageProps) {
  const { id } = await params;
  return <DmProfileEditorPage profileId={id} />;
}
