import Link from 'next/link';
import { buildGameHref } from '@/lib/config/runtime';
import type { CharacterRecord, GameRecord, ModuleRecord } from '@/lib/game/types';
import { Card } from './card';

type GameEntryCardProps = {
  game: GameRecord;
  moduleRecord: ModuleRecord;
  characterRecord: CharacterRecord;
};

export function GameEntryCard({ game, moduleRecord, characterRecord }: GameEntryCardProps) {
  const gameHref = buildGameHref(game.id);

  return (
    <Card className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">当前游戏</p>
        <h1 className="text-3xl font-semibold text-zinc-950">{moduleRecord.title}</h1>
        <p className="text-sm text-zinc-600">{moduleRecord.summary}</p>
      </div>
      <div className="space-y-2 rounded-xl bg-zinc-100 p-4">
        <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">人物卡</p>
        <p className="text-xl font-medium text-zinc-950">{characterRecord.name}</p>
        <p className="text-sm leading-7 text-zinc-700">{characterRecord.summary}</p>
      </div>
      <div className="space-y-3 rounded-xl bg-zinc-950 p-4 text-sm leading-7 text-white">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">游戏地址</p>
        <p className="break-all text-zinc-200">{gameHref}</p>
        <p className="text-zinc-300">当前游戏运行页已经并入主站，建局后会直接进入该页面。</p>
      </div>
      <Link
        className="inline-flex items-center justify-center rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
        href={gameHref}
      >
        进入游戏
      </Link>
    </Card>
  );
}
