'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/components/button';
import type { UserRole } from '@/lib/game/types';

type Props = {
  userId: string;
  role: UserRole;
};

export function UserRoleControl({ userId, role }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextRole: UserRole = role === 'editor' ? 'user' : 'editor';

  function applyRole() {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? '更新失败');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      <Button
        variant={nextRole === 'editor' ? 'primary' : 'secondary'}
        disabled={isPending}
        onClick={applyRole}
        type="button"
      >
        {isPending ? '处理中…' : nextRole === 'editor' ? '设为 editor' : '降级为 user'}
      </Button>
    </div>
  );
}
