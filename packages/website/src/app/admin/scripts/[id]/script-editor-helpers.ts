import type { ScriptEnemyAttack, ScriptEnemySkill, ScriptSkillOption } from '@/lib/game/types';

export function toLineText(items: string[]): string {
  return items.join('\n');
}

export function parseLineText(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseNumberValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseNumberOptional(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function numberToText(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

export function parseNumberList(value: string): number[] {
  return value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

export function parseNumberMap(value: string): Record<string, number> | undefined {
  const result: Record<string, number> = {};
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const [rawKey, rawValue] = line.split(':').map((part) => part.trim());
      if (!rawKey) {
        return;
      }
      const parsed = Number(rawValue);
      if (Number.isFinite(parsed)) {
        result[rawKey] = parsed;
      }
    });
  return Object.keys(result).length > 0 ? result : undefined;
}

export function formatNumberMap(value?: Record<string, number>): string {
  if (!value) {
    return '';
  }
  return Object.entries(value)
    .map(([key, numberValue]) => `${key}: ${numberValue}`)
    .join('\n');
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

export function ensureId(value: string, fallback: string, prefix: string): string {
  const raw = value.trim();
  if (raw) {
    return raw;
  }
  const slug = slugify(fallback);
  if (slug) {
    return `${prefix}-${slug}`;
  }
  return createId(prefix);
}

export function parseSkillOptions(value: string): ScriptSkillOption[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((item) => item.trim()))
    .map(([id, label, group]) => {
      const display = label ?? id ?? '';
      const safeId = ensureId(id ?? '', display ?? '', 'skill');
      return {
        id: safeId,
        label: label ?? id ?? '',
        group: group ?? '',
      };
    })
    .filter((item) => item.label);
}

export function formatSkillOptions(options: ScriptSkillOption[]): string {
  return options.map((item) => `${item.id} | ${item.label}${item.group ? ` | ${item.group}` : ''}`).join('\n');
}

export function parseEnemyAttacks(value: string): ScriptEnemyAttack[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((item) => item.trim()))
    .map(([name, chance, damage, effect]) => {
      if (!name || !chance || !damage) {
        return null;
      }
      const parsedChance = Number(chance);
      return {
        name,
        chance: Number.isFinite(parsedChance) ? parsedChance : 0,
        damage,
        effect: effect || undefined,
      } as ScriptEnemyAttack;
    })
    .filter((item): item is ScriptEnemyAttack => Boolean(item));
}

export function formatEnemyAttacks(attacks: ScriptEnemyAttack[]): string {
  return attacks
    .map((attack) => {
      const parts = [attack.name, String(attack.chance), attack.damage];
      if (attack.effect) {
        parts.push(attack.effect);
      }
      return parts.join(' | ');
    })
    .join('\n');
}

export function parseEnemySkills(value: string): ScriptEnemySkill[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('|').map((item) => item.trim()))
    .map(([name, rawValue]) => {
      if (!name || !rawValue) {
        return null;
      }
      const parsedValue = Number(rawValue);
      return {
        name,
        value: Number.isFinite(parsedValue) ? parsedValue : 0,
      } as ScriptEnemySkill;
    })
    .filter((item): item is ScriptEnemySkill => Boolean(item));
}

export function formatEnemySkills(skills: ScriptEnemySkill[]): string {
  return skills.map((skill) => `${skill.name} | ${skill.value}`).join('\n');
}
