import { describe, expect, it } from 'vitest';
import { DEFAULT_ATTRIBUTE_POINT_BUDGET, resolveAttributePointBudget } from './rules';

describe('rules', () => {
  it('未传入覆盖值时使用默认预算', () => {
    expect(resolveAttributePointBudget()).toBe(DEFAULT_ATTRIBUTE_POINT_BUDGET);
  });

  it('传入有效覆盖值时使用覆盖', () => {
    expect(resolveAttributePointBudget(320)).toBe(320);
  });

  it('覆盖值为 0 时回退默认预算', () => {
    expect(resolveAttributePointBudget(0)).toBe(DEFAULT_ATTRIBUTE_POINT_BUDGET);
  });
});
