import { describe, expect, it } from 'vitest';
import {
  buildAttributeOptions,
  buildDefaultFormState,
  calculateAttributeTotal,
  defaultSkillOptions,
} from '../character-creator-data';

describe('character-creator-data', () => {
  it('可以覆盖属性范围', () => {
    const options = buildAttributeOptions({
      strength: { min: 30, max: 40 },
    });
    const strength = options.find((item) => item.id === 'strength');
    expect(strength?.min).toBe(30);
    expect(strength?.max).toBe(40);
  });

  it('会使用剧本提供的职业与出身作为默认值', () => {
    const formState = buildDefaultFormState({
      occupationOptions: ['神父'],
      originOptions: ['松柏镇'],
      skillOptions: defaultSkillOptions.slice(0, 2),
    });
    expect(formState.occupation).toBe('神父');
    expect(formState.origin).toBe('松柏镇');
  });

  it('会遵循剧本技能上限选择默认技能数量', () => {
    const formState = buildDefaultFormState({
      skillOptions: defaultSkillOptions.slice(0, 3),
      skillLimit: 1,
    });
    const selectedCount = Object.values(formState.skills).filter(Boolean).length;
    expect(selectedCount).toBe(1);
  });

  it('会在预算内生成默认属性', () => {
    const formState = buildDefaultFormState({
      attributePointBudget: 260,
    });
    const total = calculateAttributeTotal(formState.attributes);
    expect(total).toBeLessThanOrEqual(260);
  });
});
