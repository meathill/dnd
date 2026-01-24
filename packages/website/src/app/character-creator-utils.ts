import type { CharacterFieldErrors } from '../lib/game/types';

export function getRandomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
