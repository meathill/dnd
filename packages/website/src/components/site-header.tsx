import Link from 'next/link';
import { canEdit } from '@/lib/auth/permission';
import { getRequestSession } from '@/lib/auth/session';
import { resolveAdminEmails } from '@/lib/config/runtime';
import { SignOutButton } from './sign-out-button';

export async function SiteHeader() {
  const session = await getRequestSession();
  const adminEmails = await resolveAdminEmails();
  const showBackstage = session ? canEdit({ email: session.email, role: session.role }, adminEmails) : false;
  return (
    <header className="border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link className="text-lg font-semibold text-zinc-950" href="/">
          肉团长
        </Link>
        <nav className="flex items-center gap-6 text-sm text-zinc-600">
          <Link href="/">模组</Link>
          {showBackstage ? <Link href="/admin">后台</Link> : null}
          {session ? <Link href="/billing">余额 {session.balance}</Link> : null}
          {session ? (
            <>
              <span>{session.displayName}</span>
              <SignOutButton />
            </>
          ) : (
            <Link href="/login">登录</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
