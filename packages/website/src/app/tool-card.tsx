'use client';

import type { ReactNode } from 'react';
import { cn } from '../lib/utils';
import type { ToolCallDisplay } from '../lib/game/types';

type ToolCardProps = {
  call: ToolCallDisplay;
};

type TempNpcPayload = {
  kind: 'temp_npc';
  npc: {
    name: string;
    occupation: string;
    role: 'ally' | 'neutral' | 'enemy';
    personality: string;
    appearance?: string;
    attributes: Record<string, number>;
    hp: number;
  };
};

type RoleplayNpcPayload = {
  kind: 'roleplay_npc';
  npc?: {
    name: string;
    role: string;
    summary?: string;
    hp?: number;
    traits?: string[];
  };
  error?: string;
};

type ImagePayload = {
  kind: 'map' | 'character_art';
  caption?: string;
  prompt?: string;
  size?: string;
  b64?: string;
  url?: string;
  error?: string;
};

type ToolResultPayload = TempNpcPayload | RoleplayNpcPayload | ImagePayload;

function parseStructuredResult(raw: string | undefined): ToolResultPayload | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === 'object' && 'kind' in value) {
      return value as ToolResultPayload;
    }
  } catch {
    // not JSON — fall through to dice parsing
  }
  return null;
}

const npcRoleLabel: Record<string, string> = {
  ally: '友方',
  neutral: '中立',
  enemy: '敌对',
};

const attributeLabel: Record<string, string> = {
  strength: '力量',
  dexterity: '敏捷',
  constitution: '体质',
  size: '体型',
  intelligence: '智力',
  willpower: '意志',
  appearance: '外貌',
  education: '教育',
};

type ParsedDiceResult = {
  label: string;
  roll: number | null;
  threshold: number | null;
  outcome: string;
  note: string;
};

const checkTypeLabels: Record<string, string> = {
  skill: '技能检定',
  attribute: '属性检定',
  luck: '幸运检定',
  sanity: '理智检定',
  combat: '战斗检定',
};

const outcomeStyles: Record<string, { color: string; badge: string }> = {
  大成功: { color: 'text-[var(--accent-moss)]', badge: 'bg-[var(--accent-moss)]' },
  成功: { color: 'text-[var(--accent-river)]', badge: 'bg-[var(--accent-river)]' },
  失败: { color: 'text-[var(--accent-ember)]', badge: 'bg-[var(--accent-ember)]' },
  大失败: { color: 'text-[var(--accent-ember)]', badge: 'bg-[var(--accent-ember)]' },
};

function parseDiceResult(result: string): ParsedDiceResult {
  const match = result.match(/^([^（(]+?)(?:检定)?\s*(?:（[^）]*）)?\s*1D100\s*→\s*(\d+)\s*\/\s*(\d+)[，,]\s*([^（(]+)(?:[（(]([^）)]+)[）)])?/);
  if (match) {
    return {
      label: match[1].trim(),
      roll: Number(match[2]),
      threshold: Number(match[3]),
      outcome: match[4].trim(),
      note: (match[5] ?? '').trim(),
    };
  }
  return { label: '检定', roll: null, threshold: null, outcome: '', note: result };
}

function buildTitle(call: ToolCallDisplay): string {
  if (call.name === 'roll_dice') {
    const args = call.args as {
      checkType?: string;
      target?: string;
    };
    const typeLabel = args.checkType ? checkTypeLabels[args.checkType] ?? '检定' : '检定';
    const target = args.target ? `· ${args.target}` : '';
    return `${typeLabel} ${target}`.trim();
  }
  if (call.name === 'create_temp_npc') {
    const name = (call.args as { name?: string })?.name;
    return `生成临时 NPC${name ? ` · ${name}` : ''}`;
  }
  if (call.name === 'roleplay_npc') {
    const target = (call.args as { nameOrId?: string })?.nameOrId;
    return `调取 NPC 档案${target ? ` · ${target}` : ''}`;
  }
  if (call.name === 'draw_map') {
    const caption = (call.args as { caption?: string })?.caption;
    return `绘制地图${caption ? ` · ${caption}` : ''}`;
  }
  if (call.name === 'draw_character_art') {
    const caption = (call.args as { caption?: string })?.caption;
    return `绘制立绘${caption ? ` · ${caption}` : ''}`;
  }
  return call.name;
}

function pendingHint(name: string): string {
  switch (name) {
    case 'roll_dice':
      return '掷骰中…';
    case 'create_temp_npc':
      return '生成中…';
    case 'roleplay_npc':
      return '取档中…';
    case 'draw_map':
    case 'draw_character_art':
      return '绘制中…';
    default:
      return '执行中…';
  }
}

function toolIcon(name: string): string {
  switch (name) {
    case 'roll_dice':
      return '🎲';
    case 'create_temp_npc':
      return '👤';
    case 'roleplay_npc':
      return '🎭';
    case 'draw_map':
      return '🗺️';
    case 'draw_character_art':
      return '🖼️';
    default:
      return '✨';
  }
}

function ToolCardShell({
  call,
  rightSlot,
  children,
}: {
  call: ToolCallDisplay;
  rightSlot?: ReactNode;
  children?: ReactNode;
}) {
  const isPending = call.status === 'pending';
  const reason = (call.args as { reason?: string })?.reason ?? '';
  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-3 text-sm shadow-sm',
        'border-[rgba(27,20,12,0.12)] bg-white/80 backdrop-blur',
        isPending && 'animate-[slow-glow_2s_ease-out_infinite]',
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold text-white',
            'bg-[var(--accent-brass)]',
            isPending && call.name === 'roll_dice' ? 'dice-tumble' : 'dice-flip-in',
          )}
          style={{ perspective: '200px' }}
          aria-hidden
        >
          <span>{toolIcon(call.name)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">Tool</span>
            <span className="truncate text-sm font-medium text-[var(--ink-strong)]">{buildTitle(call)}</span>
          </div>
          {reason ? (
            <p className="truncate text-xs text-[var(--ink-soft)]">{reason}</p>
          ) : null}
        </div>
        {rightSlot ??
          (isPending ? (
            <span className="shrink-0 rounded-full bg-[var(--ink-soft)] px-2 py-0.5 text-[11px] font-medium text-white">
              {pendingHint(call.name)}
            </span>
          ) : null)}
      </div>
      {children}
    </div>
  );
}

function DiceCard({ call }: { call: ToolCallDisplay }) {
  const isPending = call.status === 'pending';
  const parsed = call.result ? parseDiceResult(call.result) : null;
  const tone = parsed ? outcomeStyles[parsed.outcome] : null;
  const rightSlot =
    tone && parsed?.outcome ? (
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white',
          tone.badge,
        )}
      >
        {parsed.outcome}
      </span>
    ) : isPending ? (
      <span className="shrink-0 rounded-full bg-[var(--ink-soft)] px-2 py-0.5 text-[11px] font-medium text-white">
        {pendingHint(call.name)}
      </span>
    ) : null;
  return (
    <ToolCardShell call={call} rightSlot={rightSlot}>
      {parsed && parsed.roll != null && parsed.threshold != null ? (
        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--ink-muted)]">
          <span className="tabular-nums">
            <span className={cn('text-base font-semibold', tone?.color ?? 'text-[var(--ink-strong)]')}>
              {parsed.roll}
            </span>
            <span className="mx-1 text-[var(--ink-soft)]">/</span>
            <span>{parsed.threshold}</span>
          </span>
          {parsed.note ? <span className="truncate">{parsed.note}</span> : null}
        </div>
      ) : !parsed && call.result ? (
        <p className="mt-2 whitespace-pre-line text-xs text-[var(--ink-muted)]">{call.result}</p>
      ) : null}
    </ToolCardShell>
  );
}

function TempNpcCard({ call, payload }: { call: ToolCallDisplay; payload: TempNpcPayload }) {
  const { npc } = payload;
  const roleLabel = npcRoleLabel[npc.role] ?? '中立';
  return (
    <ToolCardShell
      call={call}
      rightSlot={
        <span className="shrink-0 rounded-full bg-[var(--accent-brass)] px-2 py-0.5 text-[11px] font-medium text-white">
          {roleLabel}
        </span>
      }
    >
      <div className="mt-2 space-y-2 text-xs text-[var(--ink-muted)]">
        <p>
          <span className="text-[var(--ink-strong)] font-medium">{npc.name}</span>
          <span className="ml-2 text-[var(--ink-soft)]">{npc.occupation}</span>
        </p>
        <p className="whitespace-pre-line text-[var(--ink-muted)]">{npc.personality}</p>
        {npc.appearance ? <p className="text-[var(--ink-soft)]">外貌：{npc.appearance}</p> : null}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-[rgba(27,20,12,0.04)] p-2 tabular-nums">
          {Object.entries(npc.attributes).map(([key, value]) => (
            <div className="flex flex-col items-center" key={key}>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--ink-soft)]">
                {attributeLabel[key] ?? key}
              </span>
              <span className="text-sm font-semibold text-[var(--ink-strong)]">{value}</span>
            </div>
          ))}
        </div>
        <p className="text-[var(--ink-soft)]">HP：{npc.hp}</p>
      </div>
    </ToolCardShell>
  );
}

function RoleplayNpcCard({ call, payload }: { call: ToolCallDisplay; payload: RoleplayNpcPayload }) {
  return (
    <ToolCardShell call={call}>
      <div className="mt-2 text-xs text-[var(--ink-muted)]">
        {payload.error ? (
          <p className="text-[var(--accent-ember)]">{payload.error}</p>
        ) : payload.npc ? (
          <>
            <p>
              <span className="font-medium text-[var(--ink-strong)]">{payload.npc.name}</span>
              {payload.npc.role ? (
                <span className="ml-2 text-[var(--ink-soft)]">{payload.npc.role}</span>
              ) : null}
            </p>
            {payload.npc.summary ? (
              <p className="mt-1 whitespace-pre-line">{payload.npc.summary}</p>
            ) : null}
            {payload.npc.traits && payload.npc.traits.length > 0 ? (
              <p className="mt-1 text-[var(--ink-soft)]">特性：{payload.npc.traits.join('、')}</p>
            ) : null}
          </>
        ) : null}
      </div>
    </ToolCardShell>
  );
}

function ImageCard({ call, payload }: { call: ToolCallDisplay; payload: ImagePayload }) {
  const src = payload.b64 ? `data:image/png;base64,${payload.b64}` : payload.url;
  return (
    <ToolCardShell call={call}>
      <div className="mt-2 space-y-2 text-xs text-[var(--ink-muted)]">
        {payload.error ? (
          <p className="text-[var(--accent-ember)]">{payload.error}</p>
        ) : src ? (
          <figure className="overflow-hidden rounded-lg border border-[rgba(27,20,12,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt={payload.caption ?? '生成的图像'}
              className="block h-auto w-full"
              loading="lazy"
              src={src}
            />
            {payload.caption ? (
              <figcaption className="bg-[rgba(27,20,12,0.04)] px-2 py-1 text-[11px] text-[var(--ink-muted)]">
                {payload.caption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
    </ToolCardShell>
  );
}

export default function ToolCard({ call }: ToolCardProps) {
  if (call.name === 'roll_dice') {
    return <DiceCard call={call} />;
  }

  const payload = parseStructuredResult(call.result);

  if (call.name === 'create_temp_npc') {
    return payload && payload.kind === 'temp_npc' ? (
      <TempNpcCard call={call} payload={payload} />
    ) : (
      <ToolCardShell call={call} />
    );
  }

  if (call.name === 'roleplay_npc') {
    return payload && payload.kind === 'roleplay_npc' ? (
      <RoleplayNpcCard call={call} payload={payload} />
    ) : (
      <ToolCardShell call={call} />
    );
  }

  if (call.name === 'draw_map' || call.name === 'draw_character_art') {
    return payload && (payload.kind === 'map' || payload.kind === 'character_art') ? (
      <ImageCard call={call} payload={payload} />
    ) : (
      <ToolCardShell call={call} />
    );
  }

  return (
    <ToolCardShell call={call}>
      {call.result ? (
        <p className="mt-2 whitespace-pre-line text-xs text-[var(--ink-muted)]">{call.result}</p>
      ) : null}
    </ToolCardShell>
  );
}
