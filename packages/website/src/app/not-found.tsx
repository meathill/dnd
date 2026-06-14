import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">404</p>
        <h1 className="text-3xl font-semibold text-zinc-950">页面没找到</h1>
        <p className="max-w-md text-zinc-600">你访问的页面可能被移除，或者从未存在。回到首页继续看看其他模组吧。</p>
      </div>
      <Link
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
        href="/"
      >
        回到首页
      </Link>
    </div>
  );
}
