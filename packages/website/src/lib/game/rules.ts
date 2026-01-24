import type { AttributeRangeMap } from './types';

export const DEFAULT_ATTRIBUTE_POINT_BUDGET = 460;

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
