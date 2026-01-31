import type { AttributeKey, AttributeRangeMap, ScriptRuleOverrides, SkillAllocationMode } from './types';

export const DEFAULT_ATTRIBUTE_POINT_BUDGET = 460;
export const DEFAULT_TRAINED_SKILL_VALUE = 50;
export const DEFAULT_UNTRAINED_SKILL_VALUE = 20;
export const DEFAULT_CHECK_DC = 100;
export const DEFAULT_SKILL_MAX_VALUE = 75;
export const DEFAULT_SKILL_ALLOCATION_MODE: SkillAllocationMode = 'quickstart';
export const DEFAULT_QUICKSTART_CORE_VALUES = [70, 60, 60, 50, 50, 50];
export const DEFAULT_QUICKSTART_INTEREST_COUNT = 2;
export const DEFAULT_QUICKSTART_INTEREST_BONUS = 20;
export const RULEBOOK_CHECK_DC_OVERRIDES: Record<string, number> = {};

export const DEFAULT_ATTRIBUTE_RANGES: AttributeRangeMap = {
  strength: { min: 15, max: 90 },
  dexterity: { min: 15, max: 90 },
  constitution: { min: 15, max: 90 },
  size: { min: 40, max: 90 },
  intelligence: { min: 40, max: 90 },
  willpower: { min: 15, max: 90 },
  appearance: { min: 15, max: 90 },
  education: { min: 40, max: 90 },
};

export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollLuck(): number {
  return (rollDie(6) + rollDie(6) + rollDie(6)) * 5;
}

export function resolveAttributePointBudget(override?: number): number {
  if (typeof override === 'number' && override > 0) {
    return override;
  }
  return DEFAULT_ATTRIBUTE_POINT_BUDGET;
}

export function resolveAttributeRanges(override?: AttributeRangeMap): AttributeRangeMap {
  const result: AttributeRangeMap = { ...DEFAULT_ATTRIBUTE_RANGES };
  if (!override) {
    return result;
  }
  for (const [key, value] of Object.entries(override)) {
    if (!value) {
      continue;
    }
    result[key as keyof AttributeRangeMap] = value;
  }
  return result;
}

export type CheckDifficulty = 'normal' | 'hard' | 'extreme';

export type CheckRollResult = {
  roll: number;
  threshold: number;
  success: boolean;
  outcome: string;
  difficultyLabel: string;
};

export function rollD100(randomFn: () => number = Math.random): number {
  return Math.floor(randomFn() * 100) + 1;
}

export function resolveDifficultyThreshold(baseValue: number, difficulty: CheckDifficulty): number {
  if (difficulty === 'hard') {
    return Math.floor(baseValue / 2);
  }
  if (difficulty === 'extreme') {
    return Math.floor(baseValue / 5);
  }
  return baseValue;
}

export function checkSkill(
  dc: number,
  skillValue: number,
  difficulty: CheckDifficulty = 'normal',
  randomFn: () => number = Math.random,
): CheckRollResult {
  const roll = rollD100(randomFn);
  const baseThreshold = resolveDifficultyThreshold(skillValue, difficulty);
  const effectiveDc = resolveCheckDcValue(dc);
  const threshold = Math.min(baseThreshold, effectiveDc);
  const success = roll <= threshold;
  const difficultyLabel = difficulty === 'hard' ? '困难' : difficulty === 'extreme' ? '极难' : '普通';
  return {
    roll,
    threshold,
    success,
    outcome: success ? '成功' : '失败',
    difficultyLabel,
  };
}

export function checkAttribute(
  dc: number,
  attributeValue: number,
  difficulty: CheckDifficulty = 'normal',
  randomFn: () => number = Math.random,
): CheckRollResult {
  return checkSkill(dc, attributeValue, difficulty, randomFn);
}

export function checkLuck(
  dc: number,
  luckValue: number,
  difficulty: CheckDifficulty = 'normal',
  randomFn: () => number = Math.random,
): CheckRollResult {
  return checkSkill(dc, luckValue, difficulty, randomFn);
}

export function checkSanity(
  dc: number,
  sanityValue: number,
  difficulty: CheckDifficulty = 'normal',
  randomFn: () => number = Math.random,
): CheckRollResult {
  return checkSkill(dc, sanityValue, difficulty, randomFn);
}

export function resolveCheckDcValue(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return DEFAULT_CHECK_DC;
  }
  return Math.min(Math.max(Math.round(value), 1), 100);
}

export function resolveScriptRuleNumber(value: number | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  return fallback;
}

export function resolveSkillMaxValue(rules: ScriptRuleOverrides | undefined): number {
  return resolveScriptRuleNumber(rules?.skillMaxValue, DEFAULT_SKILL_MAX_VALUE);
}

export function resolveTrainedSkillValue(rules: ScriptRuleOverrides | undefined): number {
  return resolveScriptRuleNumber(rules?.skillValueTrained, DEFAULT_TRAINED_SKILL_VALUE);
}

export function resolveUntrainedSkillValue(rules: ScriptRuleOverrides | undefined): number {
  return resolveScriptRuleNumber(rules?.skillValueUntrained, DEFAULT_UNTRAINED_SKILL_VALUE);
}

export function resolveDefaultCheckDc(rules: ScriptRuleOverrides | undefined): number {
  return resolveScriptRuleNumber(rules?.defaultCheckDc, DEFAULT_CHECK_DC);
}

export function calculateCocSkillPointBudget(attributes: Partial<Record<AttributeKey, number>> | undefined): number {
  if (!attributes) {
    return 0;
  }
  const education =
    typeof attributes.education === 'number' && Number.isFinite(attributes.education) ? attributes.education : 0;
  const intelligence =
    typeof attributes.intelligence === 'number' && Number.isFinite(attributes.intelligence)
      ? attributes.intelligence
      : 0;
  return Math.max(0, Math.floor(education * 4 + intelligence * 2));
}

export function resolveSkillPointBudget(
  rules: ScriptRuleOverrides | undefined,
  attributes?: Partial<Record<AttributeKey, number>>,
): number {
  if (typeof rules?.skillPointBudget === 'number' && Number.isFinite(rules.skillPointBudget)) {
    return Math.max(0, Math.floor(rules.skillPointBudget));
  }
  return calculateCocSkillPointBudget(attributes);
}

export type QuickstartSkillConfig = {
  coreValues: number[];
  interestCount: number;
  interestBonus: number;
};

export type QuickstartAssignments = {
  core: Record<string, number | null>;
  interest: Record<string, boolean>;
};

export function resolveSkillAllocationMode(rules?: ScriptRuleOverrides): SkillAllocationMode {
  if (rules?.skillAllocationMode) {
    return rules.skillAllocationMode;
  }
  return DEFAULT_SKILL_ALLOCATION_MODE;
}

export function resolveQuickstartSkillConfig(rules?: ScriptRuleOverrides): QuickstartSkillConfig {
  const coreValues =
    Array.isArray(rules?.quickstartCoreValues) && rules?.quickstartCoreValues.length > 0
      ? rules.quickstartCoreValues.filter((value) => typeof value === 'number' && Number.isFinite(value) && value > 0)
      : DEFAULT_QUICKSTART_CORE_VALUES;
  const interestCount =
    typeof rules?.quickstartInterestCount === 'number' && Number.isFinite(rules.quickstartInterestCount)
      ? Math.max(0, Math.floor(rules.quickstartInterestCount))
      : DEFAULT_QUICKSTART_INTEREST_COUNT;
  const interestBonus =
    typeof rules?.quickstartInterestBonus === 'number' && Number.isFinite(rules.quickstartInterestBonus)
      ? Math.max(0, Math.floor(rules.quickstartInterestBonus))
      : DEFAULT_QUICKSTART_INTEREST_BONUS;
  return {
    coreValues: coreValues.length > 0 ? coreValues.map((value) => Math.floor(value)) : DEFAULT_QUICKSTART_CORE_VALUES,
    interestCount,
    interestBonus,
  };
}

export function normalizeQuickstartSkillConfig(
  config: QuickstartSkillConfig,
  skillCount: number,
): QuickstartSkillConfig {
  const safeSkillCount = Math.max(0, Math.floor(skillCount));
  const coreValues = config.coreValues.slice(0, safeSkillCount);
  const remaining = Math.max(0, safeSkillCount - coreValues.length);
  const interestCount = Math.min(config.interestCount, remaining);
  return {
    coreValues,
    interestCount,
    interestBonus: config.interestBonus,
  };
}

function buildCoreValueCounter(values: number[]): Record<number, number> {
  const result: Record<number, number> = {};
  values.forEach((value) => {
    result[value] = (result[value] ?? 0) + 1;
  });
  return result;
}

export function buildEmptyQuickstartAssignments(skillIds: string[]): QuickstartAssignments {
  const core: Record<string, number | null> = {};
  const interest: Record<string, boolean> = {};
  skillIds.forEach((skillId) => {
    core[skillId] = null;
    interest[skillId] = false;
  });
  return { core, interest };
}

export function deriveQuickstartAssignments(
  skillIds: string[],
  skills: Record<string, number>,
  baseValues: Record<string, number>,
  config: QuickstartSkillConfig,
): QuickstartAssignments {
  const effectiveConfig = normalizeQuickstartSkillConfig(config, skillIds.length);
  const assignment = buildEmptyQuickstartAssignments(skillIds);
  const coreCounter = buildCoreValueCounter(effectiveConfig.coreValues);
  let interestRemaining = effectiveConfig.interestCount;
  const ambiguous: string[] = [];

  skillIds.forEach((skillId) => {
    const baseValue = baseValues[skillId] ?? 0;
    const currentValue = skills[skillId] ?? baseValue;
    if (currentValue <= baseValue) {
      return;
    }
    const isInterestValue = currentValue === baseValue + effectiveConfig.interestBonus;
    const coreSlots = coreCounter[currentValue] ?? 0;
    if (coreSlots > 0 && !isInterestValue) {
      assignment.core[skillId] = currentValue;
      coreCounter[currentValue] = coreSlots - 1;
      return;
    }
    if (isInterestValue && coreSlots === 0) {
      if (interestRemaining > 0) {
        assignment.interest[skillId] = true;
        interestRemaining -= 1;
      }
      return;
    }
    if (isInterestValue && coreSlots > 0) {
      ambiguous.push(skillId);
    }
  });

  ambiguous.forEach((skillId) => {
    const baseValue = baseValues[skillId] ?? 0;
    const currentValue = skills[skillId] ?? baseValue;
    const coreSlots = coreCounter[currentValue] ?? 0;
    if (coreSlots > 0) {
      assignment.core[skillId] = currentValue;
      coreCounter[currentValue] = coreSlots - 1;
      return;
    }
    if (interestRemaining > 0) {
      assignment.interest[skillId] = true;
      interestRemaining -= 1;
    }
  });

  return assignment;
}

export function buildQuickstartSkillValues(
  skillIds: string[],
  baseValues: Record<string, number>,
  assignments: QuickstartAssignments,
  config: QuickstartSkillConfig,
): Record<string, number> {
  const normalizedConfig = normalizeQuickstartSkillConfig(config, skillIds.length);
  const values: Record<string, number> = {};
  skillIds.forEach((skillId) => {
    const baseValue = baseValues[skillId] ?? 0;
    const coreValue = assignments.core[skillId];
    if (typeof coreValue === 'number' && Number.isFinite(coreValue) && coreValue > 0) {
      values[skillId] = Math.max(baseValue, Math.floor(coreValue));
      return;
    }
    if (assignments.interest[skillId]) {
      values[skillId] = baseValue + normalizedConfig.interestBonus;
      return;
    }
    values[skillId] = baseValue;
  });
  return values;
}

export type DcResolution = {
  dc: number;
  source: 'script' | 'rulebook' | 'game' | 'ai' | 'default';
  shouldPersist: boolean;
};

export function resolveCheckDc({
  targetKey,
  aiDc,
  scriptRules,
  gameOverrides,
}: {
  targetKey: string;
  aiDc?: number;
  scriptRules?: ScriptRuleOverrides;
  gameOverrides?: Record<string, number>;
}): DcResolution {
  const scriptOverride = scriptRules?.checkDcOverrides?.[targetKey];
  if (typeof scriptOverride === 'number' && Number.isFinite(scriptOverride)) {
    return { dc: resolveCheckDcValue(scriptOverride), source: 'script', shouldPersist: false };
  }

  const scriptDefault = scriptRules?.defaultCheckDc;
  if (typeof scriptDefault === 'number' && Number.isFinite(scriptDefault)) {
    return { dc: resolveCheckDcValue(scriptDefault), source: 'script', shouldPersist: false };
  }

  const rulebookOverride = RULEBOOK_CHECK_DC_OVERRIDES[targetKey];
  if (typeof rulebookOverride === 'number' && Number.isFinite(rulebookOverride)) {
    return { dc: resolveCheckDcValue(rulebookOverride), source: 'rulebook', shouldPersist: false };
  }

  const gameOverride = gameOverrides?.[targetKey];
  if (typeof gameOverride === 'number' && Number.isFinite(gameOverride)) {
    return { dc: resolveCheckDcValue(gameOverride), source: 'game', shouldPersist: false };
  }

  if (typeof aiDc === 'number' && Number.isFinite(aiDc)) {
    return { dc: resolveCheckDcValue(aiDc), source: 'ai', shouldPersist: true };
  }

  return { dc: DEFAULT_CHECK_DC, source: 'default', shouldPersist: false };
}
