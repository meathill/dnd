import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_ATTRIBUTE_POINT_BUDGET,
  DEFAULT_SKILL_MAX_VALUE,
  DEFAULT_QUICKSTART_CORE_VALUES,
  calculateCocSkillPointBudget,
  resolveAttributePointBudget,
  resolveQuickstartSkillConfig,
  resolveSkillAllocationMode,
  resolveSkillMaxValue,
  resolveSkillPointBudget,
  rollLuck,
} from './rules';

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

  it('未传入覆盖值时使用默认技能上限', () => {
    expect(resolveSkillMaxValue()).toBe(DEFAULT_SKILL_MAX_VALUE);
  });

  it('默认采用 quick-start 技能分配模式', () => {
    expect(resolveSkillAllocationMode()).toBe('quickstart');
  });

  it('幸运值采用 3d6*5', () => {
    const randomSpy = vi.spyOn(Math, 'random');
    randomSpy.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0);
    expect(rollLuck()).toBe(15);

    randomSpy.mockReturnValueOnce(0.999).mockReturnValueOnce(0.999).mockReturnValueOnce(0.999);
    expect(rollLuck()).toBe(90);

    randomSpy.mockRestore();
  });

  it('COC 技能点预算使用 EDU*4 + INT*2', () => {
    expect(calculateCocSkillPointBudget({ education: 60, intelligence: 70 })).toBe(380);
  });

  it('快速分配默认技能值与数量', () => {
    const config = resolveQuickstartSkillConfig();
    expect(config.coreValues).toEqual(DEFAULT_QUICKSTART_CORE_VALUES);
    expect(config.interestCount).toBe(2);
    expect(config.interestBonus).toBe(20);
  });

  it('技能点预算优先使用剧本覆盖值', () => {
    expect(resolveSkillPointBudget({ skillPointBudget: 120 }, { education: 60, intelligence: 70 })).toBe(120);
  });
});
