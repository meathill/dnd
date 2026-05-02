import { describe, expect, it } from 'vitest';
import { SAMPLE_SCRIPT } from '../game/sample-script';
import type { CharacterRecord } from '../game/types';
import { executeLocalAgentSkill, localAgentSkills } from './skills';

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
      strength: 35,
      dexterity: 60,
      constitution: 50,
      size: 55,
      intelligence: 75,
      willpower: 65,
      appearance: 50,
      education: 70,
    },
    skills: {
      spotHidden: 70,
      listen: 60,
      persuade: 60,
      firearms: 50,
      brawl: 50,
      occult: 50,
      psychology: 40,
      stealth: 40,
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
  it('会导出第一批通用 skills 定义', () => {
    expect(localAgentSkills.length).toBeGreaterThanOrEqual(10);
    expect(localAgentSkills.some((skill) => skill.name === 'roll_dice')).toBe(true);
    expect(localAgentSkills.some((skill) => skill.name === 'create_character')).toBe(true);
    expect(localAgentSkills.some((skill) => skill.name === 'patch_character')).toBe(true);
    expect(localAgentSkills.some((skill) => skill.name === 'validate_character')).toBe(true);
    expect(localAgentSkills.some((skill) => skill.name === 'save_local_report')).toBe(true);
    expect(localAgentSkills.some((skill) => skill.name === 'patch_npc')).toBe(true);
    expect(localAgentSkills.some((skill) => skill.name === 'patch_scene')).toBe(true);
    expect(localAgentSkills.every((skill) => skill.version === 1)).toBe(true);
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

  it('可以执行模组 patch skills 并返回结构化修改建议', async () => {
    const patchNpc = (await executeLocalAgentSkill(
      'patch_npc',
      {
        name: '亚伯神父',
        type: '神职人员',
        role: 'ally',
        summary: '了解驱邪仪式，但不敢独自进入老宅。',
      },
      { rootDir: '/tmp/opencode' },
    )) as {
      kind: string;
      action: string;
      mode: string;
      changedFields: string[];
      summary: string;
    };
    const patchScene = (await executeLocalAgentSkill(
      'patch_scene',
      {
        id: 'scene-basement',
        summary: '让地下室场景更强调仪式痕迹与时间压力。',
        hooks: ['破碎盐圈', '孩童哭声', '烧焦祷文'],
      },
      { rootDir: '/tmp/opencode' },
    )) as {
      targetId?: string;
      mode: string;
      patch: { hooks?: string[] };
      summary: string;
    };

    expect(patchNpc.kind).toBe('module_patch');
    expect(patchNpc.action).toBe('patch_npc');
    expect(patchNpc.mode).toBe('create');
    expect(patchNpc.changedFields).toContain('name');
    expect(patchNpc.summary).toContain('建议新增 NPC');

    expect(patchScene.targetId).toBe('scene-basement');
    expect(patchScene.mode).toBe('update');
    expect(patchScene.patch.hooks).toEqual(['破碎盐圈', '孩童哭声', '烧焦祷文']);
    expect(patchScene.summary).toContain('建议更新场景');
  });

  it('可以基于剧本创建有效人物卡', async () => {
    const result = (await executeLocalAgentSkill(
      'create_character',
      {
        name: '林雾',
        occupation: '记者',
        preferredSkillIds: ['spotHidden', 'listen', 'persuade'],
      },
      { rootDir: '/tmp/opencode', script: SAMPLE_SCRIPT, randomFn: () => 0.2 },
    )) as {
      character: CharacterRecord;
      isValid: boolean;
      fieldErrors: Record<string, unknown>;
      summary: string;
    };

    const selectedSkillCount = Object.values(result.character.skills).filter((value) => value > 20).length;
    expect(result.character.scriptId).toBe(SAMPLE_SCRIPT.id);
    expect(result.character.name).toBe('林雾');
    expect(result.character.occupation).toBe('记者');
    expect(result.character.inventory).toEqual(['录音机', '手电筒', '盐']);
    expect(selectedSkillCount).toBe(8);
    expect(result.isValid).toBe(true);
    expect(result.fieldErrors).toEqual({});
    expect(result.summary).toContain('人物卡已生成');
  });

  it('可以 patch 并校验人物卡', async () => {
    const baseCharacter = buildCharacter();
    const patchResult = (await executeLocalAgentSkill(
      'patch_character',
      {
        character: baseCharacter,
        patch: {
          note: '改为优先保护目击者。',
          skills: { spotHidden: 70 },
          inventory: ['手电筒', '录音机'],
        },
      },
      { rootDir: '/tmp/opencode', script: SAMPLE_SCRIPT },
    )) as {
      character: CharacterRecord;
      changedFields: string[];
      isValid: boolean;
    };

    const validateResult = (await executeLocalAgentSkill(
      'validate_character',
      {
        character: {
          ...patchResult.character,
          inventory: ['不存在的圣遗物'],
        },
      },
      { rootDir: '/tmp/opencode', script: SAMPLE_SCRIPT },
    )) as {
      isValid: boolean;
      fieldErrors: { inventory?: string };
      summary: string;
    };

    expect(patchResult.character.note).toBe('改为优先保护目击者。');
    expect(patchResult.character.skills.spotHidden).toBe(70);
    expect(patchResult.changedFields).toContain('note');
    expect(patchResult.changedFields).toContain('skills.spotHidden');
    expect(patchResult.isValid).toBe(true);

    expect(validateResult.isValid).toBe(false);
    expect(validateResult.fieldErrors.inventory).toBe('人物卡装备不在剧本允许范围内');
    expect(validateResult.summary).toContain('装备');
  });
});
