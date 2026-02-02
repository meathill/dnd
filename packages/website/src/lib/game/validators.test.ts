import { describe, expect, it } from 'vitest';
import { parseCharacterPayload, parseCreateGamePayload, validateCharacterAgainstScript } from './validators';
import { DEFAULT_ATTRIBUTE_POINT_BUDGET } from './rules';
import type { ScriptDefinition } from './types';

const baseCharacter = {
  scriptId: 'script-001',
  name: '沈砚',
  occupation: '调查记者',
  age: '31',
  origin: '静默港口',
  appearance: '瘦高',
  background: '旧案追踪',
  motivation: '寻找真相',
  luck: 55,
  attributes: { strength: 50, dexterity: 60 },
  skills: { spotHidden: 50, libraryUse: 20 },
  inventory: ['速记本', '左轮手枪'],
  buffs: ['冷静分析'],
  debuffs: ['轻微受伤'],
  note: '习惯记录',
};

const baseScript: ScriptDefinition = {
  id: 'script-validate',
  title: '限定剧本',
  summary: '限制人物卡选项。',
  setting: '现代',
  difficulty: '中等',
  openingMessages: [],
  background: {
    overview: '',
    truth: '',
    themes: [],
    factions: [],
    locations: [],
    secrets: [],
  },
  storyArcs: [],
  npcProfiles: [],
  skillOptions: [{ id: 'spotHidden', label: '侦查', group: '调查' }],
  equipmentOptions: ['手电筒', '录音机'],
  occupationOptions: [
    { id: 'occupation-priest', name: '神父', summary: '', skillIds: [], equipment: [] },
    { id: 'occupation-detective', name: '刑警', summary: '', skillIds: [], equipment: [] },
  ],
  originOptions: ['松柏镇'],
  buffOptions: ['灵感加持'],
  debuffOptions: ['噩梦缠身'],
  attributeRanges: {
    strength: { min: 30, max: 70 },
    dexterity: { min: 30, max: 70 },
    constitution: { min: 30, max: 70 },
    size: { min: 30, max: 70 },
    intelligence: { min: 30, max: 70 },
    willpower: { min: 30, max: 70 },
    appearance: { min: 30, max: 70 },
    education: { min: 30, max: 70 },
  },
  attributePointBudget: 400,
  skillLimit: 1,
  equipmentLimit: 1,
  buffLimit: 1,
  debuffLimit: 1,
  rules: { skillAllocationMode: 'selection', skillPointBudget: 0 },
  scenes: [],
  encounters: [],
};

const basePayload = {
  scriptId: 'script-validate',
  name: '沈砚',
  occupation: '神父',
  age: '31',
  origin: '松柏镇',
  appearance: '瘦高',
  background: '旧案追踪',
  motivation: '寻找真相',
  luck: 55,
  attributes: {
    strength: 50,
    dexterity: 50,
    constitution: 50,
    size: 50,
    intelligence: 50,
    willpower: 50,
    appearance: 50,
    education: 50,
  },
  skills: { spotHidden: 50 },
  inventory: ['手电筒'],
  buffs: ['灵感加持'],
  debuffs: ['噩梦缠身'],
  note: '习惯记录',
};

describe('parseCharacterPayload', () => {
  it('可以解析有效的人物卡请求', () => {
    const result = parseCharacterPayload(baseCharacter);
    expect(result?.name).toBe('沈砚');
    expect(result?.inventory).toHaveLength(2);
  });

  it('缺少名称会返回 null', () => {
    const result = parseCharacterPayload({ ...baseCharacter, name: '' });
    expect(result).toBeNull();
  });

  it('缺少剧本会返回 null', () => {
    const { scriptId: _scriptId, ...rest } = baseCharacter;
    const result = parseCharacterPayload(rest);
    expect(result).toBeNull();
  });

  it('属性不是数字会返回 null', () => {
    const result = parseCharacterPayload({
      ...baseCharacter,
      attributes: { strength: '50' },
    });
    expect(result).toBeNull();
  });

  it('支持字符串形式的装备列表', () => {
    const result = parseCharacterPayload({
      ...baseCharacter,
      inventory: '速记本、左轮手枪',
    });
    expect(result?.inventory).toEqual(['速记本', '左轮手枪']);
  });
});

describe('parseCreateGamePayload', () => {
  it('脚本与人物卡齐全即可通过', () => {
    const result = parseCreateGamePayload({ scriptId: 's1', characterId: 'c1' });
    expect(result).toEqual({ scriptId: 's1', characterId: 'c1' });
  });

  it('缺少字段会返回 null', () => {
    const result = parseCreateGamePayload({ scriptId: 's1' });
    expect(result).toBeNull();
  });
});

describe('validateCharacterAgainstScript', () => {
  it('会拦截剧本未允许的职业与装备', () => {
    const errors = validateCharacterAgainstScript(
      {
        ...basePayload,
        occupation: '记者',
        inventory: ['圣水'],
      },
      baseScript,
    );
    expect(errors.occupation).toBe('人物卡职业不在剧本允许范围内');
    expect(errors.inventory).toBe('人物卡装备不在剧本允许范围内');
  });

  it('会拦截超出属性范围', () => {
    const errors = validateCharacterAgainstScript(
      {
        ...basePayload,
        attributes: {
          ...basePayload.attributes,
          strength: 99,
        },
      },
      baseScript,
    );
    expect(errors.attributes).toContain('人物卡属性超出剧本范围');
    expect(errors.attributes).toContain('属性点总和超出上限 400');
    expect(errors.attributeErrors?.strength).toBe('范围 30-70');
  });

  it('会拦截属性点总和超出上限', () => {
    const errors = validateCharacterAgainstScript(
      {
        ...basePayload,
        attributes: {
          ...basePayload.attributes,
          strength: 70,
        },
      },
      baseScript,
    );
    expect(errors.attributes).toBe('属性点总和超出上限 400');
  });

  it('未设置预算时使用规则默认', () => {
    const errors = validateCharacterAgainstScript(
      {
        ...basePayload,
        attributes: {
          strength: 80,
          dexterity: 80,
          constitution: 80,
          size: 80,
          intelligence: 80,
          willpower: 80,
          appearance: 80,
          education: 80,
        },
      },
      { ...baseScript, attributePointBudget: 0, attributeRanges: {} },
    );
    expect(errors.attributes).toContain(`属性点总和超出上限 ${DEFAULT_ATTRIBUTE_POINT_BUDGET}`);
  });

  it('会拦截未知技能与状态', () => {
    const errors = validateCharacterAgainstScript(
      {
        ...basePayload,
        skills: { stealth: 50 },
        buffs: ['夜视适应'],
      },
      baseScript,
    );
    expect(errors.skills).toBe('人物卡技能不在剧本允许范围内');
    expect(errors.buffs).toBe('人物卡增益状态不在剧本允许范围内');
  });

  it('会拦截超过数量上限', () => {
    const errors = validateCharacterAgainstScript(
      {
        ...basePayload,
        skills: { spotHidden: 50, libraryUse: 50 },
        inventory: ['手电筒', '录音机'],
      },
      {
        ...baseScript,
        skillOptions: [...baseScript.skillOptions, { id: 'libraryUse', label: '图书馆使用', group: '调查' }],
        rules: { skillAllocationMode: 'selection', skillPointBudget: 0 },
      },
    );
    expect(errors.skills).toBe('技能最多选择 1 项');
    expect(errors.inventory).toBe('装备最多选择 1 件');
  });

  it('quick-start 规则会校验核心与兴趣技能', () => {
    const quickstartScript: ScriptDefinition = {
      ...baseScript,
      skillOptions: [
        { id: 'spotHidden', label: '侦查', group: '调查' },
        { id: 'listen', label: '聆听', group: '调查' },
        { id: 'stealth', label: '潜行', group: '行动' },
      ],
      rules: {
        skillAllocationMode: 'quickstart',
        quickstartCoreValues: [70, 60],
        quickstartInterestCount: 1,
        quickstartInterestBonus: 20,
      },
    };
    const payload = {
      ...basePayload,
      skills: { spotHidden: 70, listen: 60, stealth: 40 },
    };
    const errors = validateCharacterAgainstScript(payload, quickstartScript);
    expect(errors.skills).toBeUndefined();
  });

  it('quick-start 会拦截不符合的技能值', () => {
    const quickstartScript: ScriptDefinition = {
      ...baseScript,
      skillOptions: [
        { id: 'spotHidden', label: '侦查', group: '调查' },
        { id: 'listen', label: '聆听', group: '调查' },
        { id: 'stealth', label: '潜行', group: '行动' },
      ],
      rules: {
        skillAllocationMode: 'quickstart',
        quickstartCoreValues: [70, 60],
        quickstartInterestCount: 1,
        quickstartInterestBonus: 20,
      },
    };
    const payload = {
      ...basePayload,
      skills: { spotHidden: 75, listen: 60, stealth: 40 },
    };
    const errors = validateCharacterAgainstScript(payload, quickstartScript);
    expect(errors.skills).toBe('技能值不符合快速分配规则');
  });
});
