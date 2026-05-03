'use client';

import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/auth-client';

export function SignOutButton() {
  const router = useRouter();

  async function handleClick() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button className="text-sm text-zinc-500 transition hover:text-zinc-950" onClick={handleClick} type="button">
      退出
    </button>
  );
}
