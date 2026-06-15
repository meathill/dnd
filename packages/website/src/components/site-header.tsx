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
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link className="text-lg font-semibold text-zinc-950" href="/">
            肉团长
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-zinc-600 md:flex">
            <NavLink href="/">模组</NavLink>
            {showBackstage ? <NavLink href="/admin/module-drafts">创作中心</NavLink> : null}
            {session?.isAdmin ? <NavLink href="/admin">管理</NavLink> : null}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link
                aria-label={`余额 ${session.balance}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200 transition hover:bg-amber-100"
                href="/billing"
              >
                <span aria-hidden="true">●</span>
                <span>{session.balance}</span>
              </Link>
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden text-zinc-700 md:inline">{session.displayName}</span>
                <SignOutButton />
              </div>
            </>
          ) : (
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-900 px-3.5 text-sm font-medium text-white hover:bg-zinc-800"
              href="/login"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link className="rounded-md px-2 py-1 transition hover:bg-zinc-100 hover:text-zinc-950" href={href}>
      {children}
    </Link>
  );
}
