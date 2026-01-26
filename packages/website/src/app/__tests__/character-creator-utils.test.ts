import type { AttributeOption } from '../character-creator-data';
import { buildRandomAttributes } from '../character-creator-utils';

describe('人物卡随机属性', () => {
  const attributeOptions: AttributeOption[] = [
    { id: 'strength', label: '力量', min: 10, max: 12, recommendedMin: 10, group: '身体' },
    { id: 'dexterity', label: '敏捷', min: 10, max: 12, recommendedMin: 10, group: '身体' },
    { id: 'constitution', label: '体质', min: 10, max: 12, recommendedMin: 10, group: '身体' },
  ];

  it('预算在范围内时会完整用尽', () => {
    const attributes = buildRandomAttributes(attributeOptions, 33);
    const total = Object.values(attributes).reduce((sum, value) => sum + value, 0);

    expect(total).toBe(33);
    attributeOptions.forEach((option) => {
      const value = attributes[option.id];
      expect(value).toBeGreaterThanOrEqual(option.min);
      expect(value).toBeLessThanOrEqual(option.max);
    });
  });

  it('预算不足时回退到最小值', () => {
    const attributes = buildRandomAttributes(attributeOptions, 20);
    const total = Object.values(attributes).reduce((sum, value) => sum + value, 0);

    expect(total).toBe(30);
    attributeOptions.forEach((option) => {
      expect(attributes[option.id]).toBe(option.min);
    });
  });

  it('预算超出上限时回退到最大值', () => {
    const attributes = buildRandomAttributes(attributeOptions, 40);
    const total = Object.values(attributes).reduce((sum, value) => sum + value, 0);

    expect(total).toBe(36);
    attributeOptions.forEach((option) => {
      expect(attributes[option.id]).toBe(option.max);
    });
  });
});
