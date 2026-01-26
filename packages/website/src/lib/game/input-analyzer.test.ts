import { buildAnalysisPrompts, parseInputAnalysis } from './input-analyzer';
import type { CharacterRecord, ScriptDefinition } from './types';

const sampleScript: ScriptDefinition = {
  id: 'script-1',
  title: '测试剧本',
  summary: '测试',
  setting: '现代',
  difficulty: '低',
  openingMessages: [],
  skillOptions: [],
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
  skills: {},
  inventory: [],
  buffs: [],
  debuffs: [],
  note: '',
  createdAt: '',
  updatedAt: '',
};

describe('parseInputAnalysis', () => {
  it('可以解析模型 JSON', () => {
    const text = JSON.stringify({
      allowed: true,
      reason: '',
      intent: 'combat',
      needsDice: true,
      diceType: 'combat',
      diceTarget: '枪械',
      difficulty: 'hard',
      tags: ['attack'],
      actions: [
        {
          type: 'attack',
          target: '邪教徒',
          skill: '枪械',
          dc: 90,
          difficulty: 'hard',
          reason: '开枪射击',
        },
      ],
    });
    const result = parseInputAnalysis(text, '我开枪射击门后的敌人。');
    expect(result.intent).toBe('combat');
    expect(result.needsDice).toBe(true);
    expect(result.diceType).toBe('combat');
    expect(result.diceTarget).toBe('枪械');
    expect(result.difficulty).toBe('hard');
    expect(result.actions.length).toBe(1);
    expect(result.actions[0]?.type).toBe('attack');
    if (result.actions[0]?.type === 'attack') {
      expect(result.actions[0].dc).toBe(90);
    }
  });

  it('无 JSON 时返回失败', () => {
    const result = parseInputAnalysis('回复内容', '我想观察门口有没有脚印。');
    expect(result.allowed).toBe(false);
    expect(result.intent).toBe('invalid');
  });
});

describe('buildAnalysisPrompts', () => {
  it('包含剧本信息与输入内容', () => {
    const prompts = buildAnalysisPrompts(sampleScript, sampleCharacter, '测试输入');
    expect(prompts.userPrompt).toContain('测试剧本');
    expect(prompts.userPrompt).toContain('测试输入');
    expect(prompts.userPrompt).toContain('测试角色');
  });
});
