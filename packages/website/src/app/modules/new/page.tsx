import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';
import { ModuleDraftForm } from './form';

export default async function NewModulePage() {
  const session = await getRequestSession();
  if (!session) {
    redirect('/login?next=/modules/new');
  }
  const adminEmails = await resolveAdminEmails();
  if (!canEdit({ email: session.email, role: session.role }, adminEmails)) {
    redirect('/');
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Authoring</p>
        <h1 className="text-3xl font-semibold text-zinc-950">创作新模组</h1>
        <p className="max-w-2xl text-zinc-600">先填好 Meta 信息，下一步进入会话与「创作模组」skill 协作。</p>
      </div>
      <Card>
        <ModuleDraftForm />
      </Card>
    </div>
  );
}
