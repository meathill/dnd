import type { AttributeKey } from '../lib/game/types';
import type { AttributeOption } from './character-creator-data';
import type { CharacterFieldErrors } from '../lib/game/types';

export function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function buildRandomAttributes(
  attributeOptions: AttributeOption[],
  attributePointBudget: number,
): Record<AttributeKey, number> {
  const attributes: Record<AttributeKey, number> = {} as Record<AttributeKey, number>;
  const minTotal = attributeOptions.reduce((sum, option) => sum + option.min, 0);
  const maxTotal = attributeOptions.reduce((sum, option) => sum + option.max, 0);

  if (attributePointBudget <= 0) {
    attributeOptions.forEach((option) => {
      attributes[option.id] = getRandomInRange(option.min, option.max);
    });
    return attributes;
  }

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
    attributes[option.id] = option.min;
  });

  let remaining = attributePointBudget - minTotal;
  const capacities = attributeOptions.map((option) => option.max - option.min);

  while (remaining > 0) {
    const candidates = capacities.map((capacity, index) => ({ capacity, index })).filter((item) => item.capacity > 0);
    if (candidates.length === 0) {
      break;
    }
    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    const option = attributeOptions[selected.index];
    attributes[option.id] += 1;
    capacities[selected.index] -= 1;
    remaining -= 1;
  }

  return attributes;
}

export function parseInventoryList(value: string): string[] {
  return value
    .split(/[、，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function findErrorStep(errors: CharacterFieldErrors): number | null {
  if (errors.name || errors.occupation || errors.origin) {
    return 0;
  }
  if (errors.attributes || errors.attributeErrors) {
    return 1;
  }
  if (errors.skills || errors.inventory) {
    return 2;
  }
  if (errors.buffs || errors.debuffs) {
    return 3;
  }
  return null;
}

export function buildAttributeErrorMessage(
  fieldErrors: CharacterFieldErrors,
  attributeBudgetErrorMessage: string,
): string | undefined {
  if (!attributeBudgetErrorMessage) {
    return fieldErrors.attributes;
  }
  if (!fieldErrors.attributes || fieldErrors.attributes.includes(attributeBudgetErrorMessage)) {
    return attributeBudgetErrorMessage;
  }
  return `${fieldErrors.attributes}，且${attributeBudgetErrorMessage}`;
}
