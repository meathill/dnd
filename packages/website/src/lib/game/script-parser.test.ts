import { describe, expect, it } from 'vitest';
import { parseScriptDefinition } from './script-parser';

describe('parseScriptDefinition', () => {
  it('未传 rulesetId 时默认使用 coc-7e-lite', () => {
    const result = parseScriptDefinition(
      {
        title: '测试剧本',
        summary: '测试简介',
        setting: '现代',
        difficulty: '低',
      },
      'script-default-ruleset',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.rulesetId).toBe('coc-7e-lite');
    }
  });

  it('会解析遭遇中的规则书引用', () => {
    const result = parseScriptDefinition(
      {
        title: '测试剧本',
        summary: '测试简介',
        setting: '现代',
        difficulty: '中',
        encounters: [
          {
            id: 'encounter-1',
            title: '邪教徒埋伏',
            summary: '走廊尽头突然出现人影。',
            danger: '中',
            rulebookRefs: [
              {
                entityId: 'npc-cultist-basic',
                entityType: 'npc_template',
                count: 2,
              },
            ],
          },
        ],
      },
      'script-encounter-ref',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.encounters[0]?.rulebookRefs?.[0]).toMatchObject({
        rulesetId: 'coc-7e-lite',
        entityId: 'npc-cultist-basic',
        count: 2,
      });
    }
  });

  it('会解析 NPC 的规则书引用', () => {
    const result = parseScriptDefinition(
      {
        title: '测试剧本',
        summary: '测试简介',
        setting: '现代',
        difficulty: '中',
        npcProfiles: [
          {
            id: 'npc-1',
            name: '王太太',
            type: '目击者',
            role: 'neutral',
            threat: '低',
            summary: '看见过可疑的黑影。',
            useWhen: '玩家打听情况时',
            status: '不安',
            hp: 10,
            attacks: [],
            skills: [],
            traits: [],
            tactics: '',
            weakness: '',
            sanityLoss: '0/0',
            rulebookRef: {
              entityId: 'npc-frightened-witness',
              entityType: 'npc_template',
              note: '沿用受惊目击者模板',
            },
          },
        ],
      },
      'script-npc-ref',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.npcProfiles[0]?.rulebookRef).toMatchObject({
        rulesetId: 'coc-7e-lite',
        entityId: 'npc-frightened-witness',
      });
    }
  });
});
