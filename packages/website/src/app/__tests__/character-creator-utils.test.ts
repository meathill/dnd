import type { AttributeOption } from '../character-creator-data';
import { buildRandomAttributes, resolveOccupationPreset } from '../character-creator-utils';

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

describe('职业预设解析', () => {
  it('会过滤不存在的技能与装备', () => {
    const occupation = {
      id: 'occupation-test',
      name: '调查员',
      summary: '',
      skillIds: ['spotHidden', 'invalid-skill', 'spotHidden'],
      equipment: ['手电筒', '不存在的道具', '手电筒'],
    };
    const preset = resolveOccupationPreset(
      occupation,
      [
        { id: 'spotHidden', label: '侦查', group: '调查' },
        { id: 'listen', label: '聆听', group: '调查' },
      ],
      ['手电筒', '录音机'],
    );
    expect(preset.skillIds).toEqual(['spotHidden']);
    expect(preset.equipment).toEqual(['手电筒']);
  });
});
