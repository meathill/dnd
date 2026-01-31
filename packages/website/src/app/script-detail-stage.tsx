import type { ReactNode } from 'react';
import type { ScriptDefinition } from '../lib/game/types';
import { Button } from '../components/ui/button';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

type CharacterOption = {
  id: string;
  name: string;
  occupation: string;
  avatar?: string;
  isUsed?: boolean;
  gameId?: string | null;
};

export type ScriptDetailStageProps = {
  script: ScriptDefinition;
  onBack: () => void;
  onStartGame: () => void;
  onSelectCharacter: (characterId: string) => void;
  onEditCharacter: (characterId: string) => void;
  onCopyCharacter: (characterId: string) => void;
  onDeleteCharacter: (characterId: string) => void;
  characterOptions: CharacterOption[];
  selectedCharacterId: string | null;
  isLoggedIn: boolean;
  isStarting: boolean;
  statusMessage: string;
  children: ReactNode;
};

function buildList(items: string[]): string {
  return items.length > 0 ? items.join('、') : '无';
}

export default function ScriptDetailStage({
  script,
  onBack,
  onStartGame,
  onSelectCharacter,
  onEditCharacter,
  onCopyCharacter,
  onDeleteCharacter,
  characterOptions,
  selectedCharacterId,
  isLoggedIn,
  isStarting,
  statusMessage,
  children,
}: ScriptDetailStageProps) {
  const selectedCharacter = characterOptions.find((option) => option.id === selectedCharacterId);
  const canStart = Boolean(selectedCharacter);
  return (
    <div className="grid gap-4 p-3 sm:p-4 lg:h-full lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden">
      <section className="panel-card flex flex-col gap-4 rounded-xl p-3 sm:p-4 lg:h-full">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>剧本详情</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{script.title}</h2>
            <p className="text-sm text-[var(--ink-muted)]">{script.summary}</p>
            <p className="mt-2 text-xs text-[var(--ink-soft)]">
              {script.setting} · {script.difficulty}
            </p>
          </div>
          <Button onClick={onBack} size="sm" variant="outline">
            返回首页
          </Button>
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

      <aside className="panel-card flex flex-col gap-4 rounded-xl p-3 sm:p-4 lg:h-full">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>步骤</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">创建人物卡</h2>
            <p className="text-sm text-[var(--ink-muted)]">完成后即可开始冒险。</p>
          </div>
        </div>

        <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-4">
          {children}
          <div className="mt-3 border-t border-[rgba(27,20,12,0.08)] pt-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">已有角色</p>
            {!isLoggedIn ? (
              <p className="mt-2 text-xs text-[var(--ink-soft)]">登录后可以查看并选择已有角色。</p>
            ) : characterOptions.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--ink-soft)]">暂无可用角色。</p>
            ) : (
              <div className="mt-2 grid gap-2">
                {characterOptions.map((option) => {
                  const isSelected = option.id === selectedCharacterId;
                  return (
                    <div
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? 'border-[var(--accent-brass)] bg-[rgba(179,142,99,0.15)] text-[var(--ink-strong)]'
                          : 'border-[rgba(27,20,12,0.12)] text-[var(--ink-muted)] hover:border-[var(--accent-brass)]'
                      }`}
                      key={option.id}
                      onClick={() => onSelectCharacter(option.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSelectCharacter(option.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">{option.name}</span>
                        <span className="text-[11px] text-[var(--ink-soft)]">{option.occupation}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {isSelected ? (
                          <span className="rounded-lg bg-[var(--accent-brass)] px-2 py-0.5 text-[10px] text-white">
                            已选择
                          </span>
                        ) : null}
                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            onEditCharacter(option.id);
                          }}
                          size="xs"
                          variant="outline"
                        >
                          修改
                        </Button>
                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            onCopyCharacter(option.id);
                          }}
                          size="xs"
                          variant="outline"
                        >
                          复制
                        </Button>
                        <Button
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteCharacter(option.id);
                          }}
                          size="xs"
                          variant="outline"
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <Button
          className="mt-auto"
          disabled={!canStart || isStarting}
          onClick={onStartGame}
          size="sm"
          variant={canStart && !isStarting ? 'default' : 'outline'}
        >
          {isStarting ? '正在进入' : '开始游戏'}
        </Button>
        {statusMessage ? <p className="text-xs text-[var(--ink-soft)]">{statusMessage}</p> : null}
      </aside>
    </div>
  );
}
