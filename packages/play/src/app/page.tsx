import Link from 'next/link';
import { Card } from '@/components/card';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">Play Runtime</p>
        <h1 className="text-4xl font-semibold text-zinc-50">play.muirpg.com</h1>
        <p className="max-w-2xl text-zinc-400">
          这里是独立游戏运行时。正常入口应由 website 建局后跳转到 `/{'{gameId}'}`。
        </p>
      </div>
      <Card className="space-y-3">
        <p className="text-sm text-zinc-400">调试时你可以直接访问任意游戏路由，例如：</p>
        <Link className="text-sm font-medium text-zinc-50 underline underline-offset-4" href="/demo-game">
          /demo-game
        </Link>
      </Card>
    </div>
  );
}
