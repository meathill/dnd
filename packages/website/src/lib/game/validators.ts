import type { AttributeKey, CharacterFieldErrors, ScriptDefinition } from './types';
import {
  resolveAttributePointBudget,
  resolveAttributeRanges,
  deriveQuickstartAssignments,
  normalizeQuickstartSkillConfig,
  resolveQuickstartSkillConfig,
  resolveSkillAllocationMode,
  resolveSkillMaxValue,
  resolveSkillPointBudget,
  resolveUntrainedSkillValue,
} from './rules';

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
  avatar: string;
  luck: number;
  attributes: Record<AttributeKey, number>;
  skills: Record<string, number>;
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

function parseNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

function parseSkillRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  const result: Record<string, number> = {};
  for (const [key, val] of entries) {
    if (typeof val === 'number' && Number.isFinite(val)) {
      result[key] = val;
      continue;
    }
    if (typeof val === 'boolean') {
      result[key] = val ? 1 : 0;
      continue;
    }
    return null;
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
  const skills = parseSkillRecord(payload.skills);
  if (!attributes || !skills) {
    return null;
  }

  const inventory = parseInventory(payload.inventory);
  const buffs = parseStringArray(payload.buffs);
  const debuffs = parseStringArray(payload.debuffs);
  if (!inventory || !buffs || !debuffs) {
    return null;
  }

  const luck = parseNumber(payload.luck);
  if (luck === null) {
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
    avatar: parseString(payload.avatar) ?? '',
    luck,
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

  const skillAllocationMode = resolveSkillAllocationMode(script.rules);
  const skillPointBudget =
    skillAllocationMode === 'budget' ? resolveSkillPointBudget(script.rules, payload.attributes) : 0;
  const untrainedSkillValue = resolveUntrainedSkillValue(script.rules);
  const skillMaxValue = resolveSkillMaxValue(script.rules);
  const skillBaseValues = script.rules.skillBaseValues ?? {};
  const resolvedSkillBaseValues: Record<string, number> = {};
  script.skillOptions.forEach((skill) => {
    const baseValue = skillBaseValues[skill.id];
    resolvedSkillBaseValues[skill.id] =
      typeof baseValue === 'number' && Number.isFinite(baseValue) ? baseValue : untrainedSkillValue;
  });
  const skillValues = payload.skills;
  const skillEntries = Object.entries(skillValues);
  let allocatedPoints = 0;
  let selectedSkillCount = 0;
  let quickstartSelectedCount = 0;
  const quickstartConfig = normalizeQuickstartSkillConfig(
    resolveQuickstartSkillConfig(script.rules),
    script.skillOptions.length,
  );
  const quickstartAllowedCoreValues = new Set(quickstartConfig.coreValues);
  let quickstartValueError = '';
  for (const [skillId, value] of skillEntries) {
    const baseValue = resolvedSkillBaseValues[skillId] ?? untrainedSkillValue;
    if (value < baseValue) {
      errors.skills = '技能值低于基础值';
      break;
    }
    if (skillMaxValue > 0 && value > skillMaxValue) {
      errors.skills = `技能值不能超过 ${skillMaxValue}`;
      break;
    }
    if (value > baseValue) {
      if (skillAllocationMode === 'quickstart') {
        quickstartSelectedCount += 1;
        const isCoreValue = quickstartAllowedCoreValues.has(value);
        const isInterestValue = value === baseValue + quickstartConfig.interestBonus;
        if (!isCoreValue && !isInterestValue) {
          quickstartValueError = '技能值不符合快速分配规则';
          break;
        }
      } else {
        selectedSkillCount += 1;
        allocatedPoints += value - baseValue;
      }
    }
  }
  if (!errors.skills && quickstartValueError) {
    errors.skills = quickstartValueError;
  }
  if (!errors.skills && skillAllocationMode === 'quickstart') {
    const requiredSelected = quickstartConfig.coreValues.length + quickstartConfig.interestCount;
    if (quickstartSelectedCount > requiredSelected) {
      errors.skills = '技能分配超出快速分配数量';
    } else if (quickstartSelectedCount < requiredSelected) {
      errors.skills = '技能分配不足';
    }
  }
  if (!errors.skills && skillAllocationMode === 'quickstart') {
    const assignments = deriveQuickstartAssignments(
      script.skillOptions.map((option) => option.id),
      skillValues,
      resolvedSkillBaseValues,
      quickstartConfig,
    );
    const coreLimits: Record<number, number> = {};
    quickstartConfig.coreValues.forEach((value) => {
      coreLimits[value] = (coreLimits[value] ?? 0) + 1;
    });
    const coreUsage: Record<number, number> = {};
    Object.values(assignments.core).forEach((value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return;
      }
      coreUsage[value] = (coreUsage[value] ?? 0) + 1;
    });
    for (const [value, used] of Object.entries(coreUsage)) {
      const limit = coreLimits[Number(value)] ?? 0;
      if (used > limit) {
        errors.skills = '核心技能分配超出可用值';
        break;
      }
    }
    const coreSelected = Object.values(assignments.core).filter(
      (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
    ).length;
    const interestSelected = Object.values(assignments.interest).filter(Boolean).length;
    if (!errors.skills && coreSelected < quickstartConfig.coreValues.length) {
      errors.skills = '核心技能分配不足';
    }
    if (!errors.skills && interestSelected > quickstartConfig.interestCount) {
      errors.skills = `兴趣技能最多选择 ${quickstartConfig.interestCount} 项`;
    }
    if (!errors.skills && interestSelected < quickstartConfig.interestCount) {
      errors.skills = '兴趣技能分配不足';
    }
  }
  if (skillAllocationMode === 'budget') {
    if (allocatedPoints > skillPointBudget) {
      errors.skills = `技能点数超出预算 ${skillPointBudget}`;
    }
  } else if (skillAllocationMode === 'selection' && script.skillLimit > 0 && selectedSkillCount > script.skillLimit) {
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
  if (!errors.debuffs && script.debuffLimit > 0 && payload.debuffs.length < script.debuffLimit) {
    errors.debuffs = `减益状态需要选择 ${script.debuffLimit} 个`;
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
