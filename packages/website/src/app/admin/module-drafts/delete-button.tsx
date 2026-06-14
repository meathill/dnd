'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type DeleteDraftButtonProps = {
  draftId: string;
  draftTitle: string;
};

export function DeleteDraftButton({ draftId, draftTitle }: DeleteDraftButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) {
      return;
    }
    const ok = window.confirm(`确定删除草稿「${draftTitle || '（未命名）'}」？此操作不可恢复。`);
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/module-drafts/${draftId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        window.alert(data?.error ?? `删除失败：${response.status}`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : '删除请求失败');
      setBusy(false);
    }
  }

  return (
    <button
      className="text-xs text-zinc-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={busy}
      onClick={handleClick}
      type="button"
    >
      {busy ? '删除中…' : '删除'}
    </button>
  );
}
