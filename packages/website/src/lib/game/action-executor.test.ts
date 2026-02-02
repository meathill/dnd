import { executeActionPlan } from './action-executor';
import type { InputAnalysis } from './input-analyzer';
import type { CharacterRecord, ScriptDefinition } from './types';

const sampleScript: ScriptDefinition = {
  id: 'script-1',
  title: '测试剧本',
  summary: '测试',
  setting: '现代',
  difficulty: '低',
  openingMessages: [],
  background: {
    overview: '',
    truth: '',
    themes: [],
    factions: [],
    locations: [],
    explorableAreas: [],
    secrets: [],
  },
  storyArcs: [],
  npcProfiles: [],
  skillOptions: [{ id: 'spotHidden', label: '侦查', group: '调查' }],
  equipmentOptions: [],
  occupationOptions: [],
  originOptions: [],
  buffOptions: [],
  debuffOptions: [],
  attributeRanges: {},
  attributePointBudget: 0,
  skillLimit: 0,
  equipmentLimit: 0,
  buffLimit: 0,
  debuffLimit: 0,
  rules: {},
  scenes: [],
  encounters: [],
};

const sampleCharacter: CharacterRecord = {
  id: 'character-1',
  scriptId: 'script-1',
  name: '测试角色',
  occupation: '侦探',
  age: '30',
  origin: '上海',
  appearance: '',
  background: '',
  motivation: '',
  avatar: '',
  luck: 55,
  attributes: {
    strength: 60,
    dexterity: 50,
    constitution: 40,
    size: 50,
    intelligence: 60,
    willpower: 50,
    appearance: 40,
    education: 70,
  },
  skills: { spotHidden: 50 },
  inventory: [],
  buffs: [],
  debuffs: [],
  note: '',
  createdAt: '',
  updatedAt: '',
};

describe('executeActionPlan', () => {
  it('会执行属性检定并生成掷骰模块', () => {
    const analysis: InputAnalysis = {
      allowed: true,
      reason: '',
      intent: 'action',
      needsDice: true,
      diceType: 'attribute',
      diceTarget: '力量',
      difficulty: 'normal',
      tags: [],
      actions: [
        {
          type: 'check',
          checkType: 'attribute',
          target: '力量',
          dc: 90,
          difficulty: 'normal',
          reason: '',
        },
      ],
    };

    const result = executeActionPlan({
      analysis,
      script: sampleScript,
      character: sampleCharacter,
      randomFn: () => 0.36,
    });

    expect(result.modules.length).toBe(1);
    expect(result.modules[0].type).toBe('dice');
    expect(result.modules[0].content).toContain('力量检定');
    expect(result.modules[0].content).toContain('1D100 → 37 / 60');
    expect(result.modules[0].content).toContain('DC 90');
  });
});
