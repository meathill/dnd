import { describe, expect, it } from 'vitest';
import { SAMPLE_SCRIPT } from '../game/sample-script';
import type { CharacterRecord } from '../game/types';
import { executeLocalAgentSkill, localAgentSkillContracts } from './skills';

function buildCharacter(): CharacterRecord {
  return {
    id: 'character-test',
    scriptId: SAMPLE_SCRIPT.id,
    name: '沈砚',
    occupation: '记者',
    age: '31',
    origin: '松柏镇',
    appearance: '瘦高、黑色风衣、常带速记本',
    background: '追踪港口失踪案已久。',
    motivation: '找出老宅里的真相。',
    avatar: '',
    luck: 60,
    attributes: {
      strength: 45,
      dexterity: 60,
      constitution: 50,
      size: 55,
      intelligence: 75,
      willpower: 65,
      appearance: 50,
      education: 70,
    },
    skills: {
      spotHidden: 65,
      listen: 55,
      persuade: 50,
      firearms: 40,
    },
    inventory: ['手电筒', '录音机', '盐'],
    buffs: ['直觉敏锐'],
    debuffs: [],
    note: '',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

describe('local agent skills', () => {
  it('会导出第一批通用 skill contracts', () => {
    expect(localAgentSkillContracts.length).toBeGreaterThanOrEqual(10);
    expect(localAgentSkillContracts.some((skill) => skill.name === 'roll_dice')).toBe(true);
    expect(localAgentSkillContracts.some((skill) => skill.name === 'save_local_report')).toBe(true);
    expect(localAgentSkillContracts.every((skill) => skill.version === 1)).toBe(true);
  });

  it('可以执行规则书搜索与风险评估', async () => {
    const search = (await executeLocalAgentSkill(
      'search_rulebook',
      { query: '邪教徒', type: 'npc_template' },
      { rootDir: '/tmp/opencode' },
    )) as { items: Array<{ id: string }> };
    const risk = (await executeLocalAgentSkill(
      'estimate_scene_risk',
      {
        entityRefs: [
          { entityId: 'npc-cultist-basic', count: 2 },
          { entityId: 'creature-minor-spirit', count: 1 },
        ],
        cluePlan: { essentialClues: 2, gatedClues: 2, alternatePaths: 0 },
        sanityLosses: ['1/1D6'],
      },
      { rootDir: '/tmp/opencode' },
    )) as { overallRisk: string; warnings: string[] };

    expect(search.items[0]?.id).toBe('npc-cultist-basic');
    expect(['high', 'deadly']).toContain(risk.overallRisk);
    expect(risk.warnings.length).toBeGreaterThan(0);
  });

  it('可以执行检定与关键 NPC 查询', async () => {
    const character = buildCharacter();
    const roll = (await executeLocalAgentSkill(
      'roll_dice',
      { checkType: 'skill', target: '侦查', difficulty: 'hard', reason: '调查门口血迹' },
      { rootDir: '/tmp/opencode', script: SAMPLE_SCRIPT, character, randomFn: () => 0.19 },
    )) as { roll: number; outcome: string; text: string };
    const npc = (await executeLocalAgentSkill(
      'roleplay_npc',
      { nameOrId: '格蕾丝太太' },
      { rootDir: '/tmp/opencode', script: SAMPLE_SCRIPT },
    )) as { npc?: { id: string }; error?: string };

    expect(roll.roll).toBe(20);
    expect(roll.outcome).toBe('成功');
    expect(roll.text).toContain('侦查检定');
    expect(npc.npc?.id).toBe('npc-grace-neighbor');
    expect(npc.error).toBeUndefined();
  });

  it('可以执行临时 NPC 生成且结果可预测', async () => {
    const randomValues = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.1];
    let index = 0;
    const tempNpc = (await executeLocalAgentSkill(
      'create_temp_npc',
      { name: '报亭老板', occupation: '店主', role: 'neutral', personality: '谨慎、多疑' },
      {
        rootDir: '/tmp/opencode',
        randomFn: () => {
          const value = randomValues[index % randomValues.length];
          index += 1;
          return value;
        },
      },
    )) as { npc: { hp: number; attributes: { strength: number; education: number } } };

    expect(tempNpc.npc.attributes.strength).toBeGreaterThan(0);
    expect(tempNpc.npc.attributes.education).toBeGreaterThan(0);
    expect(tempNpc.npc.hp).toBeGreaterThan(0);
  });
});
