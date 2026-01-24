import type { AttributeKey, CharacterFieldErrors, ScriptDefinition } from './types';
import { resolveAttributePointBudget, resolveAttributeRanges } from './rules';

type RecordValue = Record<string, unknown>;

export type CharacterPayload = {
  scriptId: string;
  name: string;
  occupation: string;
  age: string;
  origin: string;
  appearance: string;
  background: string;
  motivation: string;
  attributes: Record<AttributeKey, number>;
  skills: Record<string, boolean>;
  inventory: string[];
  buffs: string[];
  debuffs: string[];
  note: string;
};

export type CreateGamePayload = {
  scriptId: string;
  characterId: string;
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null;
}

function parseString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const items = value.filter((item) => typeof item === 'string');
  return items.length === value.length ? items : null;
}

function parseInventory(value: unknown): string[] | null {
  if (typeof value === 'string') {
    return value
      .split(/[、，,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return parseStringArray(value);
}

function parseNumberRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  const result: Record<string, number> = {};
  for (const [key, val] of entries) {
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return null;
    }
    result[key] = val;
  }
  return result;
}

function parseBooleanRecord(value: unknown): Record<string, boolean> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  const result: Record<string, boolean> = {};
  for (const [key, val] of entries) {
    if (typeof val !== 'boolean') {
      return null;
    }
    result[key] = val;
  }
  return result;
}

const ATTRIBUTE_KEY_SET = new Set<AttributeKey>([
  'strength',
  'dexterity',
  'constitution',
  'size',
  'intelligence',
  'willpower',
  'appearance',
  'education',
]);

export function parseCharacterPayload(payload: unknown): CharacterPayload | null {
  if (!isRecord(payload)) {
    return null;
  }

  const scriptId = parseString(payload.scriptId)?.trim();
  if (!scriptId) {
    return null;
  }

  const name = parseString(payload.name)?.trim();
  if (!name) {
    return null;
  }

  const attributes = parseNumberRecord(payload.attributes);
  const skills = parseBooleanRecord(payload.skills);
  if (!attributes || !skills) {
    return null;
  }

  const inventory = parseInventory(payload.inventory);
  const buffs = parseStringArray(payload.buffs);
  const debuffs = parseStringArray(payload.debuffs);
  if (!inventory || !buffs || !debuffs) {
    return null;
  }

  return {
    scriptId,
    name,
    occupation: parseString(payload.occupation) ?? '',
    age: parseString(payload.age) ?? '',
    origin: parseString(payload.origin) ?? '',
    appearance: parseString(payload.appearance) ?? '',
    background: parseString(payload.background) ?? '',
    motivation: parseString(payload.motivation) ?? '',
    attributes: attributes as Record<AttributeKey, number>,
    skills,
    inventory,
    buffs,
    debuffs,
    note: parseString(payload.note) ?? '',
  };
}

export function parseCreateGamePayload(payload: unknown): CreateGamePayload | null {
  if (!isRecord(payload)) {
    return null;
  }
  const scriptId = parseString(payload.scriptId)?.trim();
  const characterId = parseString(payload.characterId)?.trim();
  if (!scriptId || !characterId) {
    return null;
  }
  return { scriptId, characterId };
}

export function validateCharacterAgainstScript(
  payload: CharacterPayload,
  script: ScriptDefinition,
): CharacterFieldErrors {
  const errors: CharacterFieldErrors = {};

  if (script.occupationOptions.length > 0 && !script.occupationOptions.includes(payload.occupation)) {
    errors.occupation = '人物卡职业不在剧本允许范围内';
  }

  if (script.originOptions.length > 0 && !script.originOptions.includes(payload.origin)) {
    errors.origin = '人物卡出身不在剧本允许范围内';
  }

  if (script.skillOptions.length > 0) {
    const allowedSkills = new Set(script.skillOptions.map((skill) => skill.id));
    for (const skillId of Object.keys(payload.skills)) {
      if (!allowedSkills.has(skillId)) {
        errors.skills = '人物卡技能不在剧本允许范围内';
        break;
      }
    }
  }

  const selectedSkillCount = Object.values(payload.skills).filter(Boolean).length;
  if (script.skillLimit > 0 && selectedSkillCount > script.skillLimit) {
    errors.skills = `技能最多选择 ${script.skillLimit} 项`;
  }

  if (script.equipmentOptions.length > 0) {
    const allowedEquipment = new Set(script.equipmentOptions);
    for (const item of payload.inventory) {
      if (!allowedEquipment.has(item)) {
        errors.inventory = '人物卡装备不在剧本允许范围内';
        break;
      }
    }
  }

  if (script.equipmentLimit > 0 && payload.inventory.length > script.equipmentLimit) {
    errors.inventory = `装备最多选择 ${script.equipmentLimit} 件`;
  }

  if (script.buffOptions.length > 0) {
    const allowedBuffs = new Set(script.buffOptions);
    for (const buff of payload.buffs) {
      if (!allowedBuffs.has(buff)) {
        errors.buffs = '人物卡增益状态不在剧本允许范围内';
        break;
      }
    }
  }

  if (script.buffLimit > 0 && payload.buffs.length > script.buffLimit) {
    errors.buffs = `增益状态最多选择 ${script.buffLimit} 个`;
  }

  if (script.debuffOptions.length > 0) {
    const allowedDebuffs = new Set(script.debuffOptions);
    for (const debuff of payload.debuffs) {
      if (!allowedDebuffs.has(debuff)) {
        errors.debuffs = '人物卡减益状态不在剧本允许范围内';
        break;
      }
    }
  }

  if (script.debuffLimit > 0 && payload.debuffs.length > script.debuffLimit) {
    errors.debuffs = `减益状态最多选择 ${script.debuffLimit} 个`;
  }

  const attributeErrors: Partial<Record<AttributeKey, string>> = {};
  const attributeRanges = resolveAttributeRanges(script.attributeRanges);
  for (const [key, value] of Object.entries(payload.attributes)) {
    if (!ATTRIBUTE_KEY_SET.has(key as AttributeKey)) {
      errors.attributes = '人物卡属性不合法';
      continue;
    }
    const range = attributeRanges[key as AttributeKey];
    if (range && (value < range.min || value > range.max)) {
      attributeErrors[key as AttributeKey] = `范围 ${range.min}-${range.max}`;
    }
  }
  if (Object.keys(attributeErrors).length > 0) {
    errors.attributes = '人物卡属性超出剧本范围';
    errors.attributeErrors = attributeErrors;
  }

  const attributeTotal = Object.values(payload.attributes).reduce((sum, value) => sum + value, 0);
  const attributePointBudget = resolveAttributePointBudget(script.attributePointBudget);
  if (attributePointBudget > 0 && attributeTotal > attributePointBudget) {
    const budgetMessage = `属性点总和超出上限 ${attributePointBudget}`;
    if (errors.attributes) {
      errors.attributes = `${errors.attributes}，且${budgetMessage}`;
    } else {
      errors.attributes = budgetMessage;
    }
  }

  return errors;
}
