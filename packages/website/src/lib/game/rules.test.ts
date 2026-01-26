import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ATTRIBUTE_POINT_BUDGET, resolveAttributePointBudget, rollLuck } from './rules';

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

  it('幸运值采用 3d6*5', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);
    expect(rollLuck()).toBe(15);

    randomSpy.mockReturnValueOnce(0.999).mockReturnValueOnce(0.999).mockReturnValueOnce(0.999);
    expect(rollLuck()).toBe(90);

    randomSpy.mockRestore();
  });
});
