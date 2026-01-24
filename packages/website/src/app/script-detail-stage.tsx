import type { ReactNode } from 'react';
import type { ScriptDefinition } from '../lib/game/types';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export type ScriptDetailStageProps = {
  script: ScriptDefinition;
  characterSummary: { name: string; occupation: string } | null;
  onBack: () => void;
  onStartGame: () => void;
  onEditCharacter?: () => void;
  isStarting: boolean;
  statusMessage: string;
  children: ReactNode;
};

function buildList(items: string[]): string {
  return items.length > 0 ? items.join('、') : '无';
}

export default function ScriptDetailStage({
  script,
  characterSummary,
  onBack,
  onStartGame,
  onEditCharacter,
  isStarting,
  statusMessage,
  children,
}: ScriptDetailStageProps) {
  const canStart = Boolean(characterSummary);
  return (
    <div className="grid h-full gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="panel-card flex h-full flex-col gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>剧本详情</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{script.title}</h2>
            <p className="text-sm text-[var(--ink-muted)]">{script.summary}</p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              {script.setting} · {script.difficulty}
            </p>
          </div>
          <button
            className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
            onClick={onBack}
            type="button"
          >
            返回首页
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">场景</h3>
            <div className="space-y-2">
              {script.scenes.map((scene) => (
                <div
                  className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs"
                  key={scene.id}
                >
                  <p className="font-semibold text-[var(--ink-strong)]">{scene.title}</p>
                  <p className="text-[var(--ink-muted)]">{scene.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--ink-soft)]">地点：{scene.location}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">遭遇</h3>
            <div className="space-y-2">
              {script.encounters.map((encounter) => (
                <div
                  className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] px-3 py-2 text-xs"
                  key={encounter.id}
                >
                  <p className="font-semibold text-[var(--ink-strong)]">{encounter.title}</p>
                  <p className="text-[var(--ink-muted)]">{encounter.summary}</p>
                  <p className="mt-1 text-[10px] text-[var(--ink-soft)]">危险度：{encounter.danger}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4 text-xs text-[var(--ink-muted)]">
          <p className="font-semibold text-[var(--ink-strong)]">剧本清单与限制</p>
          <p>技能：{buildList(script.skillOptions.map((skill) => skill.label))}</p>
          <p>装备：{buildList(script.equipmentOptions)}</p>
          <p>职业：{buildList(script.occupationOptions)}</p>
          <p>出身：{buildList(script.originOptions)}</p>
          <p>
            增益：{buildList(script.buffOptions)} · 上限 {script.buffLimit || '不限'}
          </p>
          <p>
            减益：{buildList(script.debuffOptions)} · 上限 {script.debuffLimit || '不限'}
          </p>
        </div>
      </section>

      <aside className="panel-card flex h-full flex-col gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>步骤</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">创建人物卡</h2>
            <p className="text-sm text-[var(--ink-muted)]">完成后即可开始冒险。</p>
          </div>
          {characterSummary && onEditCharacter ? (
            <button
              className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
              onClick={onEditCharacter}
              type="button"
            >
              继续编辑人物卡
            </button>
          ) : null}
        </div>

        <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-4">
          {children}
          {characterSummary ? (
            <div className="mt-3 text-xs text-[var(--ink-muted)]">
              已创建：
              <span className="ml-1 font-semibold text-[var(--ink-strong)]">{characterSummary.name}</span>
              <span className="ml-2">{characterSummary.occupation}</span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--ink-soft)]">尚未完成人物卡。</p>
          )}
        </div>

        <button
          className={`mt-auto rounded-lg px-3 py-2 text-sm ${
            canStart && !isStarting
              ? 'bg-[var(--accent-brass)] text-white'
              : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-soft)]'
          }`}
          disabled={!canStart || isStarting}
          onClick={onStartGame}
          type="button"
        >
          {isStarting ? '正在进入' : '开始游戏'}
        </button>
        {statusMessage ? <p className="text-xs text-[var(--ink-soft)]">{statusMessage}</p> : null}
      </aside>
    </div>
  );
}
