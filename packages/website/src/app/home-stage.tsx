import type { GameRecordSummary, ScriptDefinition } from '../lib/game/types';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export type HomeStageProps = {
  scripts: ScriptDefinition[];
  games: GameRecordSummary[];
  onSelectScript: (scriptId: string) => void;
  onContinueGame: (gameId: string) => void;
  statusMessage?: string;
  gamesMessage?: string;
};

function formatUpdatedAt(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace('T', ' ').slice(0, 16);
}

export default function HomeStage({
  scripts,
  games,
  onSelectScript,
  onContinueGame,
  statusMessage,
  gamesMessage,
}: HomeStageProps) {
  return (
    <div className="grid h-full gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="panel-card flex h-full flex-col gap-4 rounded-xl p-4">
        <div>
          <p className={sectionTitleClassName}>首页</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">剧本列表</h2>
          <p className="text-sm text-[var(--ink-muted)]">选择一个剧本查看详情与建卡入口。</p>
          {statusMessage ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{statusMessage}</p> : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {scripts.map((script) => (
            <div
              className="rounded-xl border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.7)] p-4 text-sm"
              key={script.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[var(--ink-strong)]">{script.title}</p>
                  <p className="text-xs text-[var(--ink-soft)]">{script.setting}</p>
                </div>
                <span className="rounded-lg border border-[rgba(27,20,12,0.12)] px-2 py-1 text-[10px] text-[var(--ink-soft)]">
                  {script.difficulty}
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--ink-muted)]">{script.summary}</p>
              <div className="mt-3 grid gap-2 text-xs text-[var(--ink-soft)]">
                <div>
                  <span className="font-semibold text-[var(--ink-strong)]">场景：</span>
                  {script.scenes.map((scene) => scene.title).join(' / ')}
                </div>
                <div>
                  <span className="font-semibold text-[var(--ink-strong)]">战斗：</span>
                  {script.encounters.map((encounter) => encounter.title).join(' / ')}
                </div>
              </div>
              <button
                className="mt-4 w-full rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-2 text-xs text-[var(--ink-muted)] transition hover:border-[var(--accent-brass)]"
                onClick={() => onSelectScript(script.id)}
                type="button"
              >
                查看剧本
              </button>
            </div>
          ))}
        </div>
      </section>

      <aside className="panel-card flex h-full flex-col gap-4 rounded-xl p-4">
        <div>
          <p className={sectionTitleClassName}>记录</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">游戏记录</h2>
          <p className="text-sm text-[var(--ink-muted)]">继续上一次的冒险。</p>
          {gamesMessage ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{gamesMessage}</p> : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {games.length === 0 ? (
            <p className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-4 text-xs text-[var(--ink-soft)]">
              暂无游戏记录
            </p>
          ) : (
            games.map((game) => (
              <div
                className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4 text-sm"
                key={game.id}
              >
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{game.scriptTitle}</p>
                <p className="text-xs text-[var(--ink-muted)]">角色：{game.characterName}</p>
                <p className="mt-2 text-[10px] text-[var(--ink-soft)]">更新：{formatUpdatedAt(game.updatedAt)}</p>
                <button
                  className="mt-3 w-full rounded-lg bg-[var(--accent-brass)] px-3 py-2 text-xs text-white"
                  onClick={() => onContinueGame(game.id)}
                  type="button"
                >
                  继续游戏
                </button>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
