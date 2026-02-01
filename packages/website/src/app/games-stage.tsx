import type { GameRecordSummary } from '../lib/game/types';
import { Button } from '../components/ui/button';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export type GamesStageProps = {
  games: GameRecordSummary[];
  statusMessage?: string;
  onOpenGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
};

function formatUpdatedAt(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace('T', ' ').slice(0, 16);
}

export default function GamesStage({ games, statusMessage, onOpenGame, onDeleteGame }: GamesStageProps) {
  return (
    <section className="panel-card flex flex-col gap-4 p-3 sm:p-4 lg:h-full">
      <div>
        <p className={sectionTitleClassName}>记录</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">游戏记录</h2>
        <p className="text-sm text-[var(--ink-muted)]">浏览并进入历史冒险。</p>
        {statusMessage ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{statusMessage}</p> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {games.length === 0 ? (
          <p className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-4 text-xs text-[var(--ink-soft)]">
            暂无游戏记录
          </p>
        ) : (
          games.map((game) => (
            <div
              className="flex h-full flex-col rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4 text-sm"
              key={game.id}
            >
              <p className="text-sm font-semibold text-[var(--ink-strong)]">{game.scriptTitle}</p>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">角色：{game.characterName}</p>
              <p className="mt-2 mb-4 text-[10px] text-[var(--ink-soft)]">更新：{formatUpdatedAt(game.updatedAt)}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button onClick={() => onOpenGame(game.id)} size="sm">
                  进入游戏
                </Button>
                <Button onClick={() => onDeleteGame(game.id)} size="sm" variant="destructive-outline">
                  删除记录
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
