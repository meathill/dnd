import { z } from 'zod';
import {
  buildEmptyQuickstartAssignments,
  buildQuickstartSkillValues,
  normalizeQuickstartSkillConfig,
  resolveAttributePointBudget,
  resolveAttributeRanges,
  resolveQuickstartSkillConfig,
  resolveSkillAllocationMode,
  resolveSkillMaxValue,
  resolveSkillPointBudget,
  resolveTrainedSkillValue,
  resolveUntrainedSkillValue,
} from '../game/rules.ts';
import type { AttributeKey, CharacterFieldErrors, CharacterRecord, ScriptDefinition } from '../game/types.ts';
import { validateCharacterAgainstScript, type CharacterPayload } from '../game/validators.ts';
import {
  arraySchema,
  booleanSchema,
  enumSchema,
  GENERIC_OBJECT_SCHEMA,
  integerSchema,
  objectSchema,
  stringSchema,
} from './skill-contract.ts';
import { createSkill, requireScript, rollLocalDie } from './skill-helpers.ts';

const ATTRIBUTE_KEYS: AttributeKey[] = [
  'strength',
  'dexterity',
  'constitution',
  'size',
  'intelligence',
  'willpower',
  'appearance',
  'education',
];

const fieldLabelMap: Record<Exclude<keyof CharacterFieldErrors, 'attributeErrors'>, string> = {
  name: '姓名',
  occupation: '职业',
  origin: '出身',
  attributes: '属性',
  skills: '技能',
  inventory: '装备',
  buffs: '增益状态',
  debuffs: '减益状态',
};

const attributePatchSchema = z.object({
  strength: z.number().int().min(0).max(100).optional(),
  dexterity: z.number().int().min(0).max(100).optional(),
  constitution: z.number().int().min(0).max(100).optional(),
  size: z.number().int().min(0).max(100).optional(),
  intelligence: z.number().int().min(0).max(100).optional(),
  willpower: z.number().int().min(0).max(100).optional(),
  appearance: z.number().int().min(0).max(100).optional(),
  education: z.number().int().min(0).max(100).optional(),
});

const skillValueMapSchema = z.record(z.string().min(1), z.number().int().min(0).max(100));
const inventoryInputSchema = z.union([z.string(), z.array(z.string())]);

const createCharacterInputSchema = z.object({
  characterId: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  occupation: z.string().trim().min(1).optional(),
  age: z.string().optional(),
  origin: z.string().trim().min(1).optional(),
  appearance: z.string().optional(),
  background: z.string().optional(),
  motivation: z.string().optional(),
  avatar: z.string().optional(),
  note: z.string().optional(),
  luck: z.number().int().min(0).max(100).optional(),
  attributeMode: z.enum(['default', 'random']).default('default').optional(),
  preferredSkillIds: z.array(z.string().trim().min(1)).optional(),
  attributes: attributePatchSchema.optional(),
  skills: skillValueMapSchema.optional(),
  inventory: inventoryInputSchema.optional(),
  buffs: z.array(z.string()).optional(),
  debuffs: z.array(z.string()).optional(),
});

const patchCharacterFieldsSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    occupation: z.string().trim().min(1).optional(),
    age: z.string().optional(),
    origin: z.string().trim().min(1).optional(),
    appearance: z.string().optional(),
    background: z.string().optional(),
    motivation: z.string().optional(),
    avatar: z.string().optional(),
    note: z.string().optional(),
    luck: z.number().int().min(0).max(100).optional(),
    attributes: attributePatchSchema.optional(),
    skills: skillValueMapSchema.optional(),
    inventory: inventoryInputSchema.optional(),
    buffs: z.array(z.string()).optional(),
    debuffs: z.array(z.string()).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), '至少提供一个字段');

const patchCharacterInputSchema = z.object({
  character: z.custom<CharacterRecord>((value) => typeof value === 'object' && value !== null),
  patch: patchCharacterFieldsSchema,
});

const validateCharacterInputSchema = z.object({
  character: z.custom<CharacterRecord>((value) => typeof value === 'object' && value !== null),
});

type CreateCharacterInput = z.infer<typeof createCharacterInputSchema>;
type PatchCharacterFields = z.infer<typeof patchCharacterFieldsSchema>;
type PatchCharacterInput = z.infer<typeof patchCharacterInputSchema>;
type ValidateCharacterInput = z.infer<typeof validateCharacterInputSchema>;

type CharacterValidationResult = {
  isValid: boolean;
  fieldErrors: CharacterFieldErrors;
  summary: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeText(value: string | undefined, fallback = ''): string {
  const trimmed = value?.trim() ?? '';
  return trimmed || fallback;
}

function normalizeUniqueStringArray(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeInventory(value: string | string[] | undefined): string[] {
  if (typeof value === 'string') {
    return value
      .split(/[、，,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function mergeAttributes(
  base: Record<AttributeKey, number>,
  patch: Partial<Record<AttributeKey, number>> | undefined,
): Record<AttributeKey, number> {
  const next = { ...base };
  if (!patch) {
    return next;
  }
  ATTRIBUTE_KEYS.forEach((key) => {
    const value = patch[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[key] = Math.floor(value);
    }
  });
  return next;
}

function mergeSkills(base: Record<string, number>, patch: Record<string, number> | undefined): Record<string, number> {
  const next = { ...base };
  if (!patch) {
    return next;
  }
  Object.entries(patch).forEach(([key, value]) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      next[key] = Math.floor(value);
    }
  });
  return next;
}

function pickRandomIndex(length: number, randomFn?: () => number): number {
  if (length <= 1) {
    return 0;
  }
  const raw = randomFn ? randomFn() : Math.random();
  return Math.min(length - 1, Math.max(0, Math.floor(raw * length)));
}

function randomIntInRange(min: number, max: number, randomFn?: () => number): number {
  if (max <= min) {
    return min;
  }
  const raw = randomFn ? randomFn() : Math.random();
  return min + Math.min(max - min, Math.max(0, Math.floor(raw * (max - min + 1))));
}

function buildAttributeOptions(script: ScriptDefinition): Array<{ id: AttributeKey; min: number; max: number }> {
  const ranges = resolveAttributeRanges(script.attributeRanges);
  return ATTRIBUTE_KEYS.map((key) => {
    const range = ranges[key];
    return {
      id: key,
      min: range?.min ?? 0,
      max: range?.max ?? 100,
    };
  });
}

function buildAverageAttributes(script: ScriptDefinition): Record<AttributeKey, number> {
  const attributeOptions = buildAttributeOptions(script);
  const attributePointBudget = resolveAttributePointBudget(script.attributePointBudget);
  const averageAttributes = {} as Record<AttributeKey, number>;
  attributeOptions.forEach((attribute) => {
    averageAttributes[attribute.id] = Math.round((attribute.min + attribute.max) / 2);
  });

  const averageTotal = Object.values(averageAttributes).reduce((sum, value) => sum + value, 0);
  if (averageTotal <= attributePointBudget) {
    return averageAttributes;
  }

  const minimumAttributes = {} as Record<AttributeKey, number>;
  attributeOptions.forEach((attribute) => {
    minimumAttributes[attribute.id] = attribute.min;
  });
  const minimumTotal = Object.values(minimumAttributes).reduce((sum, value) => sum + value, 0);
  if (minimumTotal >= attributePointBudget) {
    return minimumAttributes;
  }

  const adjustedAttributes = { ...averageAttributes };
  let excess = averageTotal - attributePointBudget;
  for (const attribute of attributeOptions) {
    if (excess <= 0) {
      break;
    }
    const currentValue = adjustedAttributes[attribute.id];
    const reducible = currentValue - attribute.min;
    if (reducible <= 0) {
      continue;
    }
    const reduction = Math.min(reducible, excess);
    adjustedAttributes[attribute.id] = currentValue - reduction;
    excess -= reduction;
  }
  return adjustedAttributes;
}

function buildRandomAttributes(script: ScriptDefinition, randomFn?: () => number): Record<AttributeKey, number> {
  const attributeOptions = buildAttributeOptions(script);
  const attributePointBudget = resolveAttributePointBudget(script.attributePointBudget);
  const attributes = {} as Record<AttributeKey, number>;
  const minTotal = attributeOptions.reduce((sum, option) => sum + option.min, 0);
  const maxTotal = attributeOptions.reduce((sum, option) => sum + option.max, 0);

  if (attributePointBudget <= minTotal) {
    attributeOptions.forEach((option) => {
      attributes[option.id] = option.min;
    });
    return attributes;
  }

  if (attributePointBudget >= maxTotal) {
    attributeOptions.forEach((option) => {
      attributes[option.id] = option.max;
    });
    return attributes;
  }

  attributeOptions.forEach((option) => {
    attributes[option.id] = attributePointBudget > 0 ? option.min : randomIntInRange(option.min, option.max, randomFn);
  });

  if (attributePointBudget <= 0) {
    return attributes;
  }

  let remaining = attributePointBudget - minTotal;
  const capacities = attributeOptions.map((option) => option.max - option.min);
  while (remaining > 0) {
    const candidates = capacities.map((capacity, index) => ({ capacity, index })).filter((item) => item.capacity > 0);
    if (candidates.length === 0) {
      break;
    }
    const selected = candidates[pickRandomIndex(candidates.length, randomFn)];
    const option = attributeOptions[selected.index];
    attributes[option.id] += 1;
    capacities[selected.index] -= 1;
    remaining -= 1;
  }
  return attributes;
}

function buildBaseSkillValues(script: ScriptDefinition): Record<string, number> {
  const untrainedSkillValue = resolveUntrainedSkillValue(script.rules);
  const result: Record<string, number> = {};
  script.skillOptions.forEach((skill) => {
    const baseValue = script.rules.skillBaseValues?.[skill.id];
    result[skill.id] = typeof baseValue === 'number' && Number.isFinite(baseValue) ? baseValue : untrainedSkillValue;
  });
  return result;
}

function resolveOccupationPreset(
  script: ScriptDefinition,
  occupationName: string,
): { skillIds: string[]; equipment: string[] } {
  const occupation = script.occupationOptions.find((option) => option.name === occupationName);
  if (!occupation) {
    return { skillIds: [], equipment: [] };
  }
  const allowedSkillIds = new Set(script.skillOptions.map((skill) => skill.id));
  const allowedEquipment = new Set(script.equipmentOptions);
  return {
    skillIds: Array.from(new Set(occupation.skillIds.filter((skillId) => allowedSkillIds.has(skillId)))),
    equipment: Array.from(new Set(occupation.equipment.filter((item) => allowedEquipment.has(item)))),
  };
}

function resolveOrderedSkillIds(
  script: ScriptDefinition,
  occupationName: string,
  preferredSkillIds: string[] | undefined,
): { orderedSkillIds: string[]; equipment: string[] } {
  const allSkillIds = script.skillOptions.map((skill) => skill.id);
  const allowedSkillIds = new Set(allSkillIds);
  const preferred = Array.from(
    new Set(
      (preferredSkillIds ?? []).map((skillId) => skillId.trim()).filter((skillId) => allowedSkillIds.has(skillId)),
    ),
  );
  const preset = resolveOccupationPreset(script, occupationName);
  const orderedSkillIds = [
    ...preferred,
    ...preset.skillIds.filter((skillId) => !preferred.includes(skillId)),
    ...allSkillIds.filter((skillId) => !preferred.includes(skillId) && !preset.skillIds.includes(skillId)),
  ];
  return { orderedSkillIds, equipment: preset.equipment };
}

function buildQuickstartSkillValuesForCharacter(
  script: ScriptDefinition,
  orderedSkillIds: string[],
): Record<string, number> {
  const allSkillIds = script.skillOptions.map((skill) => skill.id);
  const baseValues = buildBaseSkillValues(script);
  const config = normalizeQuickstartSkillConfig(resolveQuickstartSkillConfig(script.rules), allSkillIds.length);
  const assignments = buildEmptyQuickstartAssignments(allSkillIds);
  const uniqueOrdered = Array.from(new Set(orderedSkillIds.filter((skillId) => allSkillIds.includes(skillId))));
  const effectiveOrder = [...uniqueOrdered, ...allSkillIds.filter((skillId) => !uniqueOrdered.includes(skillId))];
  let cursor = 0;

  function takeNextSkill(): string | null {
    if (cursor >= effectiveOrder.length) {
      return null;
    }
    const nextSkillId = effectiveOrder[cursor];
    cursor += 1;
    return nextSkillId ?? null;
  }

  config.coreValues.forEach((value) => {
    const skillId = takeNextSkill();
    if (skillId) {
      assignments.core[skillId] = value;
    }
  });

  let interestRemaining = config.interestCount;
  while (interestRemaining > 0) {
    const skillId = takeNextSkill();
    if (!skillId) {
      break;
    }
    assignments.interest[skillId] = true;
    interestRemaining -= 1;
  }

  return buildQuickstartSkillValues(allSkillIds, baseValues, assignments, config);
}

function buildSelectionSkillValues(script: ScriptDefinition, orderedSkillIds: string[]): Record<string, number> {
  const result = buildBaseSkillValues(script);
  const trainedSkillValue = resolveTrainedSkillValue(script.rules);
  const selectedLimit = script.skillLimit > 0 ? script.skillLimit : 4;
  orderedSkillIds.slice(0, selectedLimit).forEach((skillId) => {
    const baseValue = result[skillId] ?? resolveUntrainedSkillValue(script.rules);
    result[skillId] = Math.max(baseValue, trainedSkillValue);
  });
  return result;
}

function buildBudgetSkillValues(
  script: ScriptDefinition,
  attributes: Record<AttributeKey, number>,
  orderedSkillIds: string[],
): Record<string, number> {
  const result = buildBaseSkillValues(script);
  const trainedSkillValue = resolveTrainedSkillValue(script.rules);
  const skillMaxValue = resolveSkillMaxValue(script.rules);
  let remainingPoints = resolveSkillPointBudget(script.rules, attributes);

  orderedSkillIds.forEach((skillId) => {
    if (remainingPoints <= 0) {
      return;
    }
    const baseValue = result[skillId] ?? resolveUntrainedSkillValue(script.rules);
    const targetValue = Math.max(baseValue, Math.min(trainedSkillValue, skillMaxValue));
    const requiredPoints = targetValue - baseValue;
    if (requiredPoints <= 0) {
      return;
    }
    const allocatedPoints = Math.min(requiredPoints, remainingPoints);
    result[skillId] = baseValue + allocatedPoints;
    remainingPoints -= allocatedPoints;
  });

  return result;
}

function buildGeneratedSkills(
  script: ScriptDefinition,
  attributes: Record<AttributeKey, number>,
  orderedSkillIds: string[],
): Record<string, number> {
  const allocationMode = resolveSkillAllocationMode(script.rules);
  if (allocationMode === 'quickstart') {
    return buildQuickstartSkillValuesForCharacter(script, orderedSkillIds);
  }
  if (allocationMode === 'selection') {
    return buildSelectionSkillValues(script, orderedSkillIds);
  }
  return buildBudgetSkillValues(script, attributes, orderedSkillIds);
}

function rollLuckValue(randomFn?: () => number): number {
  return (rollLocalDie(6, randomFn) + rollLocalDie(6, randomFn) + rollLocalDie(6, randomFn)) * 5;
}

function toCharacterPayload(character: CharacterRecord): CharacterPayload {
  return {
    scriptId: character.scriptId,
    name: character.name,
    occupation: character.occupation,
    age: character.age,
    origin: character.origin,
    appearance: character.appearance,
    background: character.background,
    motivation: character.motivation,
    avatar: character.avatar,
    luck: character.luck,
    attributes: character.attributes,
    skills: character.skills,
    inventory: character.inventory,
    buffs: character.buffs,
    debuffs: character.debuffs,
    note: character.note,
  };
}

function buildValidationSummary(errors: CharacterFieldErrors, successText: string, failurePrefix: string): string {
  const labels = Object.entries(fieldLabelMap)
    .filter(([key]) => Boolean(errors[key as keyof typeof fieldLabelMap]))
    .map(([, label]) => label);
  if (labels.length === 0) {
    return successText;
  }
  return `${failurePrefix}${labels.join('、')}。`;
}

function validateCharacterRecord(
  character: CharacterRecord,
  script: ScriptDefinition,
  successText: string,
): CharacterValidationResult {
  const fieldErrors = validateCharacterAgainstScript(toCharacterPayload(character), script);
  return {
    isValid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
    summary: buildValidationSummary(fieldErrors, successText, '人物卡仍有问题：'),
  };
}

function buildCharacterFromInput(
  input: CreateCharacterInput,
  script: ScriptDefinition,
  randomFn?: () => number,
): CharacterRecord {
  const occupation = input.occupation ?? script.occupationOptions[0]?.name ?? '';
  const origin = input.origin ?? script.originOptions[0] ?? '';
  const { orderedSkillIds, equipment } = resolveOrderedSkillIds(script, occupation, input.preferredSkillIds);
  const defaultAttributes =
    input.attributeMode === 'random' ? buildRandomAttributes(script, randomFn) : buildAverageAttributes(script);
  const attributes = mergeAttributes(defaultAttributes, input.attributes);
  const skills = mergeSkills(buildGeneratedSkills(script, attributes, orderedSkillIds), input.skills);
  const inventory =
    input.inventory !== undefined
      ? normalizeInventory(input.inventory)
      : script.equipmentOptions.length > 0
        ? equipment
        : [];
  const timestamp = nowIso();

  return {
    id: input.characterId ?? `character-${crypto.randomUUID()}`,
    scriptId: script.id,
    name: input.name ?? '未命名调查员',
    occupation,
    age: normalizeText(input.age),
    origin,
    appearance: normalizeText(input.appearance),
    background: normalizeText(input.background),
    motivation: normalizeText(input.motivation),
    avatar: normalizeText(input.avatar),
    luck: input.luck ?? rollLuckValue(randomFn),
    attributes,
    skills,
    inventory,
    buffs: input.buffs ? normalizeUniqueStringArray(input.buffs) : script.buffOptions.slice(0, 1),
    debuffs: input.debuffs
      ? normalizeUniqueStringArray(input.debuffs)
      : script.debuffLimit > 0
        ? script.debuffOptions.slice(0, script.debuffLimit)
        : [],
    note: normalizeText(input.note),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function assertCharacterScript(character: CharacterRecord, script: ScriptDefinition): void {
  if (character.scriptId !== script.id) {
    throw new Error(`人物卡 ${character.id} 不属于当前剧本 ${script.id}`);
  }
}

function applyCharacterPatch(character: CharacterRecord, patch: PatchCharacterFields): CharacterRecord {
  return {
    ...character,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.occupation !== undefined ? { occupation: patch.occupation } : {}),
    ...(patch.age !== undefined ? { age: normalizeText(patch.age) } : {}),
    ...(patch.origin !== undefined ? { origin: patch.origin } : {}),
    ...(patch.appearance !== undefined ? { appearance: normalizeText(patch.appearance) } : {}),
    ...(patch.background !== undefined ? { background: normalizeText(patch.background) } : {}),
    ...(patch.motivation !== undefined ? { motivation: normalizeText(patch.motivation) } : {}),
    ...(patch.avatar !== undefined ? { avatar: normalizeText(patch.avatar) } : {}),
    ...(patch.note !== undefined ? { note: normalizeText(patch.note) } : {}),
    ...(patch.luck !== undefined ? { luck: patch.luck } : {}),
    ...(patch.inventory !== undefined ? { inventory: normalizeInventory(patch.inventory) } : {}),
    ...(patch.buffs !== undefined ? { buffs: normalizeUniqueStringArray(patch.buffs) } : {}),
    ...(patch.debuffs !== undefined ? { debuffs: normalizeUniqueStringArray(patch.debuffs) } : {}),
    ...(patch.attributes ? { attributes: mergeAttributes(character.attributes, patch.attributes) } : {}),
    ...(patch.skills ? { skills: mergeSkills(character.skills, patch.skills) } : {}),
    updatedAt: nowIso(),
  };
}

function collectChangedFields(patch: PatchCharacterFields): string[] {
  const changedFields: string[] = [];
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (key === 'attributes' && value && typeof value === 'object') {
      ATTRIBUTE_KEYS.forEach((attributeKey) => {
        if (Object.prototype.hasOwnProperty.call(value, attributeKey)) {
          changedFields.push(`attributes.${attributeKey}`);
        }
      });
      return;
    }
    if (key === 'skills' && value && typeof value === 'object') {
      Object.keys(value).forEach((skillId) => {
        changedFields.push(`skills.${skillId}`);
      });
      return;
    }
    changedFields.push(key);
  });
  return changedFields;
}

export const createCharacterSkill = createSkill<
  CreateCharacterInput,
  { character: CharacterRecord; isValid: boolean; fieldErrors: CharacterFieldErrors; summary: string }
>({
  name: 'create_character',
  version: 1,
  title: '创建人物卡',
  description: '基于当前剧本生成一张可落盘的人物卡，并返回校验结果。',
  group: 'character',
  executionMode: 'native',
  whenToUse: ['开始 COC 小冒险前需要快速车卡时。', 'AI 需要根据剧本约束生成一张结构化调查员卡时。'],
  forbidden: ['只给出散文式角色设定，不真正生成结构化人物卡。', '忽略剧本的职业、出身、装备或技能约束。'],
  inputSchema: objectSchema(
    {
      characterId: stringSchema('人物卡 id，可留空。'),
      name: stringSchema('角色姓名，可留空。'),
      occupation: stringSchema('职业名称，可留空。'),
      age: stringSchema('年龄，可留空。'),
      origin: stringSchema('出身，可留空。'),
      appearance: stringSchema('外貌描述，可留空。'),
      background: stringSchema('背景描述，可留空。'),
      motivation: stringSchema('行动动机，可留空。'),
      avatar: stringSchema('头像地址，可留空。'),
      note: stringSchema('附注，可留空。'),
      luck: integerSchema('幸运值，可留空。', { minimum: 0, maximum: 100 }),
      attributeMode: enumSchema(['default', 'random'], '属性生成模式。', { default: 'default' }),
      preferredSkillIds: arraySchema(stringSchema('偏好的技能 id。'), '偏好的技能顺序。'),
      attributes: GENERIC_OBJECT_SCHEMA,
      skills: GENERIC_OBJECT_SCHEMA,
      inventory: {
        type: ['string', 'array'],
        description: '初始装备；可传字符串或字符串数组。',
        items: stringSchema('装备名称。'),
      },
      buffs: arraySchema(stringSchema('增益状态。'), '增益状态列表。'),
      debuffs: arraySchema(stringSchema('减益状态。'), '减益状态列表。'),
    },
    [],
    '人物卡创建参数。',
  ),
  outputSchema: objectSchema(
    {
      character: GENERIC_OBJECT_SCHEMA,
      isValid: booleanSchema('人物卡是否通过当前剧本校验。'),
      fieldErrors: GENERIC_OBJECT_SCHEMA,
      summary: stringSchema('创建结果摘要。'),
    },
    ['character', 'isValid', 'fieldErrors', 'summary'],
    '人物卡创建结果。',
  ),
  parseInput: (input) => createCharacterInputSchema.parse(input),
  execute: (input, context) => {
    const script = requireScript(context);
    const character = buildCharacterFromInput(input, script, context.randomFn);
    const validation = validateCharacterRecord(character, script, '人物卡已生成，可直接保存。');
    return {
      character,
      ...validation,
    };
  },
});

export const patchCharacterSkill = createSkill<
  PatchCharacterInput,
  {
    character: CharacterRecord;
    changedFields: string[];
    isValid: boolean;
    fieldErrors: CharacterFieldErrors;
    summary: string;
  }
>({
  name: 'patch_character',
  version: 1,
  title: '修改人物卡',
  description: '基于现有人物卡应用局部修改，并返回更新后的结构化结果与校验状态。',
  group: 'character',
  executionMode: 'native',
  whenToUse: ['需要调整人物卡的属性、技能、装备或背景字段时。', 'AI 已有一张人物卡，需要在原卡基础上做小改动时。'],
  forbidden: ['重新生成整张人物卡覆盖已有 id 和时间戳。', '人物卡属于别的剧本时仍强行在当前剧本下修改。'],
  inputSchema: objectSchema(
    {
      character: GENERIC_OBJECT_SCHEMA,
      patch: GENERIC_OBJECT_SCHEMA,
    },
    ['character', 'patch'],
    '人物卡 patch 参数。',
  ),
  outputSchema: objectSchema(
    {
      character: GENERIC_OBJECT_SCHEMA,
      changedFields: arraySchema(stringSchema('变更字段路径。'), '变更字段列表。'),
      isValid: booleanSchema('更新后的人物卡是否通过校验。'),
      fieldErrors: GENERIC_OBJECT_SCHEMA,
      summary: stringSchema('更新结果摘要。'),
    },
    ['character', 'changedFields', 'isValid', 'fieldErrors', 'summary'],
    '人物卡 patch 结果。',
  ),
  parseInput: (input) => patchCharacterInputSchema.parse(input),
  execute: (input, context) => {
    const script = requireScript(context);
    assertCharacterScript(input.character, script);
    const changedFields = collectChangedFields(input.patch);
    const character = applyCharacterPatch(input.character, input.patch);
    const validation = validateCharacterRecord(character, script, '人物卡已更新，可直接保存。');
    return {
      character,
      changedFields,
      ...validation,
      summary: validation.isValid
        ? changedFields.length > 0
          ? `人物卡已更新：${changedFields.join('、')}。`
          : validation.summary
        : validation.summary,
    };
  },
});

export const validateCharacterSkill = createSkill<
  ValidateCharacterInput,
  { isValid: boolean; fieldErrors: CharacterFieldErrors; summary: string }
>({
  name: 'validate_character',
  version: 1,
  title: '校验人物卡',
  description: '检查人物卡是否满足当前剧本的职业、属性、技能与装备限制。',
  group: 'character',
  executionMode: 'native',
  whenToUse: ['人物卡创建或修改后需要确认是否合法时。', '保存人物卡前需要做一次结构化验收时。'],
  forbidden: ['不做校验就直接把人物卡当成可用成品。'],
  inputSchema: objectSchema(
    {
      character: GENERIC_OBJECT_SCHEMA,
    },
    ['character'],
    '人物卡校验参数。',
  ),
  outputSchema: objectSchema(
    {
      isValid: booleanSchema('人物卡是否通过校验。'),
      fieldErrors: GENERIC_OBJECT_SCHEMA,
      summary: stringSchema('校验摘要。'),
    },
    ['isValid', 'fieldErrors', 'summary'],
    '人物卡校验结果。',
  ),
  parseInput: (input) => validateCharacterInputSchema.parse(input),
  execute: (input, context) => {
    const script = requireScript(context);
    assertCharacterScript(input.character, script);
    return validateCharacterRecord(input.character, script, '人物卡校验通过。');
  },
});

export const characterSkills = [createCharacterSkill, patchCharacterSkill, validateCharacterSkill];
