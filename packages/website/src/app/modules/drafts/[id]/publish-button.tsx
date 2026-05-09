'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/button';

type Props = {
  draftId: string;
  disabled?: boolean;
};

export function DraftPublishButton({ draftId, disabled }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function publish() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/module-drafts/${draftId}/publish`, { method: 'POST' });
      const payload = (await response.json().catch(() => null)) as { moduleId?: string; error?: string } | null;
      if (!response.ok || !payload?.moduleId) {
        setError(payload?.error ?? '发布失败');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={disabled || isPending} onClick={publish} type="button">
        {disabled ? '已发布' : isPending ? '发布中…' : '发布模组'}
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
