import { describe, expect, it } from 'vitest';
import { mapScriptRow, serializeCharacterPayload } from './mappers';
import type { CharacterPayload } from '../game/validators';

const baseScriptRow = {
  id: 'script-mist-harbor',
  title: '雾港疑云',
  summary: '港口雾夜的低语。',
  setting: '1923 年沿海港口',
  difficulty: '中等',
  opening_messages_json: JSON.stringify([
    { role: 'system', content: '开场' },
    { role: 'dm', content: '迷雾笼罩。' },
  ]),
  background_json: JSON.stringify({
    overview: '',
    truth: '',
    themes: [],
    factions: [],
    locations: [],
    explorableAreas: [],
    secrets: [],
  }),
  story_arcs_json: JSON.stringify([]),
  enemy_profiles_json: JSON.stringify([]),
  skill_options_json: JSON.stringify([
    { id: 'spotHidden', label: '侦查', group: '调查' },
    { id: 'occult', label: '神秘学', group: '学识' },
  ]),
  equipment_options_json: JSON.stringify(['手电筒', '录音机']),
  occupation_options_json: JSON.stringify(['码头工人', '记者']),
  origin_options_json: JSON.stringify(['河口镇', '盐港']),
  buff_options_json: JSON.stringify(['灵感加持']),
  debuff_options_json: JSON.stringify(['恐惧残留']),
  attribute_ranges_json: JSON.stringify({ strength: { min: 20, max: 80 } }),
  attribute_point_budget: 460,
  skill_limit: 4,
  equipment_limit: 5,
  buff_limit: 1,
  debuff_limit: 1,
  rules_json: JSON.stringify({}),
  scenes_json: JSON.stringify([
    {
      id: 'scene-inn',
      title: '河口旅店',
      summary: '旅店低语引出线索',
      location: '旅店',
      hooks: ['账册', '低语'],
    },
  ]),
  encounters_json: JSON.stringify([
    {
      id: 'encounter-dock',
      title: '码头斗殴',
      summary: '工人与走私客冲突',
      enemies: ['走私客 x2'],
      danger: '低',
    },
  ]),
};

const baseCharacter: CharacterPayload = {
  scriptId: 'script-001',
  name: '沈砚',
  occupation: '调查记者',
  age: '31',
  origin: '静默港口',
  appearance: '瘦高',
  background: '旧案追踪',
  motivation: '寻找真相',
  avatar: 'data:image/png;base64,avatar',
  luck: 55,
  attributes: {
    strength: 50,
    dexterity: 60,
    constitution: 55,
    size: 45,
    intelligence: 70,
    willpower: 65,
    appearance: 40,
    education: 75,
  },
  skills: { spotHidden: 50 },
  inventory: ['速记本', '左轮手枪'],
  buffs: ['冷静分析'],
  debuffs: ['轻微受伤'],
  note: '习惯记录',
};

describe('mapScriptRow', () => {
  it('可以解析脚本 JSON', () => {
    const script = mapScriptRow(baseScriptRow);
    expect(script.scenes[0]?.title).toBe('河口旅店');
    expect(script.encounters[0]?.danger).toBe('低');
    expect(script.encounters[0]?.npcs).toEqual(['走私客 x2']);
    expect(script.skillOptions[0]?.label).toBe('侦查');
    expect(script.equipmentOptions[0]).toBe('手电筒');
    expect(script.occupationOptions[0]?.name).toBe('码头工人');
    expect(script.buffOptions[0]).toBe('灵感加持');
    expect(script.openingMessages[0]?.content).toBe('开场');
    expect(script.attributeRanges.strength?.min).toBe(20);
    expect(script.attributePointBudget).toBe(460);
    expect(script.skillLimit).toBe(4);
  });
});

describe('serializeCharacterPayload', () => {
  it('会将数组写成 JSON 字符串', () => {
    const data = serializeCharacterPayload(baseCharacter);
    expect(data.inventory_json).toContain('速记本');
    expect(data.attributes_json).toContain('strength');
    expect(data.avatar).toBe('data:image/png;base64,avatar');
    expect(data.luck).toBe(55);
  });
});
