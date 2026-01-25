import { useMemo } from 'react';
import { baseAttributeOptions } from './character-creator-data';
import { attributes, buffs, debuffs, inventory, skills, stats, type StatTone } from './home-data';
import type { AttributeKey, CharacterRecord, ScriptSkillOption } from '../lib/game/types';
import { useGameStore } from '../lib/game/game-store';

const statToneStyles = {
  moss: {
    bar: 'bg-[var(--accent-moss)]',
    text: 'text-[var(--accent-moss)]',
    track: 'bg-[rgba(61,82,56,0.18)]',
  },
  brass: {
    bar: 'bg-[var(--accent-brass)]',
    text: 'text-[var(--accent-brass)]',
    track: 'bg-[rgba(182,121,46,0.18)]',
  },
  ember: {
    bar: 'bg-[var(--accent-ember)]',
    text: 'text-[var(--accent-ember)]',
    track: 'bg-[rgba(176,74,53,0.18)]',
  },
  river: {
    bar: 'bg-[var(--accent-river)]',
    text: 'text-[var(--accent-river)]',
    track: 'bg-[rgba(46,108,106,0.18)]',
  },
} satisfies Record<StatTone, { bar: string; text: string; track: string }>;

const attributeLabelMap = new Map<AttributeKey, string>(
  baseAttributeOptions.map((attribute) => [attribute.id, attribute.label]),
);

function getPercent(value: number, max: number): string {
  if (max <= 0) {
    return '0%';
  }

  const percent = Math.round((value / max) * 100);
  const clamped = Math.min(100, Math.max(0, percent));
  return `${clamped}%`;
}

function resolveAttributes(character: CharacterRecord | null) {
  if (!character) {
    return attributes;
  }
  return (Object.entries(character.attributes) as [AttributeKey, number][]).map(([key, value]) => ({
    label: attributeLabelMap.get(key) ?? key,
    value,
  }));
}

function resolveSkills(character: CharacterRecord | null, skillOptions?: ScriptSkillOption[]) {
  if (!character) {
    return skills.map((skill) => skill.label);
  }
  const labelMap = new Map(skillOptions?.map((option) => [option.id, option.label]) ?? []);
  return Object.entries(character.skills)
    .filter(([, enabled]) => enabled)
    .map(([key]) => labelMap.get(key) ?? key);
}

function resolveInventory(character: CharacterRecord | null) {
  return character ? character.inventory : inventory;
}

function resolveBuffs(character: CharacterRecord | null) {
  return character ? character.buffs : buffs;
}

function resolveDebuffs(character: CharacterRecord | null) {
  return character ? character.debuffs : debuffs;
}

type CharacterCardPanelProps = {
  skillOptions?: ScriptSkillOption[];
};

export default function CharacterCardPanel({ skillOptions }: CharacterCardPanelProps) {
  const character = useGameStore((state) => state.character);

  const activeAttributes = useMemo(() => resolveAttributes(character), [character]);
  const activeInventory = useMemo(() => resolveInventory(character), [character]);
  const activeBuffs = useMemo(() => resolveBuffs(character), [character]);
  const activeDebuffs = useMemo(() => resolveDebuffs(character), [character]);
  const activeSkills = useMemo(() => resolveSkills(character, skillOptions), [character, skillOptions]);

  const hasBuffs = activeBuffs.length > 0;
  const hasDebuffs = activeDebuffs.length > 0;
  const hasStatus = hasBuffs || hasDebuffs;

  if (!character) {
    return (
      <div
        className="panel-card animate-[fade-up_0.9s_ease-out_both] flex flex-col gap-4 rounded-xl p-4"
        style={{ animationDelay: '0.12s' }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-[linear-gradient(135deg,rgba(61,82,56,0.2),rgba(182,121,46,0.2))] p-1">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-[rgba(255,255,255,0.7)] text-sm text-[var(--ink-soft)]">
              肖像
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">人物卡</p>
            <h2 className="font-[var(--font-display)] text-2xl text-[var(--ink-strong)]">尚未创建人物卡</h2>
            <p className="text-sm text-[var(--ink-muted)]">请先在剧本详情中完成建卡。</p>
          </div>
        </div>
      </div>
    );
  }

  const profileSummary = `${character.occupation} · ${character.age} 岁 · ${character.origin}`;

  return (
    <div
      className="panel-card animate-[fade-up_0.9s_ease-out_both] flex flex-col gap-4 rounded-xl p-4"
      style={{ animationDelay: '0.12s' }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-[linear-gradient(135deg,rgba(61,82,56,0.2),rgba(182,121,46,0.2))] p-1">
          <div className="flex h-full w-full items-center justify-center rounded-xl bg-[rgba(255,255,255,0.7)] text-sm text-[var(--ink-soft)]">
            肖像
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">人物卡</p>
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--ink-strong)]">{character.name}</h2>
          <p className="text-sm text-[var(--ink-muted)]">{profileSummary}</p>
        </div>
      </div>

      <div className="space-y-4">
        {stats.map((stat) => {
          const tone = statToneStyles[stat.tone];
          return (
            <div className="space-y-2" key={stat.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--ink-muted)]">{stat.label}</span>
                <span className={`font-mono text-sm ${tone.text}`}>
                  {stat.value} / {stat.max}
                </span>
              </div>
              <div className={`h-2 w-full rounded-lg ${tone.track}`}>
                <div className={`h-2 rounded-lg ${tone.bar}`} style={{ width: getPercent(stat.value, stat.max) }}></div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">属性</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {activeAttributes.map((attr) => (
            <div className="panel-muted rounded-xl px-3 py-2" key={attr.label}>
              <p className="text-xs text-[var(--ink-soft)]">{attr.label}</p>
              <p className="font-mono text-sm text-[var(--ink-strong)]">{attr.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">核心技能</h3>
        <div className="mt-3">
          {Array.isArray(activeSkills) && activeSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {activeSkills.map((skill) => (
                <span
                  className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] px-3 py-1 text-xs text-[var(--ink-muted)]"
                  key={skill}
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">尚未选择技能</p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">随身物品</h3>
        <ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
          {activeInventory.length > 0 ? (
            activeInventory.map((item) => (
              <li className="rounded-lg bg-[rgba(255,255,255,0.6)] px-3 py-2" key={item}>
                {item}
              </li>
            ))
          ) : (
            <li className="text-[var(--ink-soft)]">暂无装备</li>
          )}
        </ul>
      </div>

      {hasStatus ? (
        <div>
          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">状态</h3>
          <div className="mt-3 space-y-4">
            {hasBuffs ? (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">增益</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeBuffs.map((buff) => (
                    <span
                      className="rounded-lg bg-[rgba(61,82,56,0.16)] px-3 py-1 text-xs text-[var(--accent-moss)]"
                      key={buff}
                    >
                      {buff}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {hasDebuffs ? (
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">减益</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeDebuffs.map((debuff) => (
                    <span
                      className="rounded-lg bg-[rgba(176,74,53,0.16)] px-3 py-1 text-xs text-[var(--accent-ember)]"
                      key={debuff}
                    >
                      {debuff}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
