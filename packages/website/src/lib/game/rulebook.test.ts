import { describe, expect, it } from 'vitest';
import {
  COC_LITE_RULESET_ID,
  estimateCocSceneRisk,
  getRulebookEntity,
  resolveRulebookRef,
  searchRulebook,
  validateCocModulePlayability,
} from './rulebook';
import { SAMPLE_SCRIPT } from './sample-script';

describe('rulebook', () => {
  it('可以搜索 COC 规则书实体', () => {
    const entities = searchRulebook({ query: '怨灵', type: 'creature' });
    expect(entities[0]?.id).toBe('creature-minor-spirit');
  });

  it('可以读取规则书实体', () => {
    const entity = getRulebookEntity('npc-cultist-basic');
    expect(entity?.name).toBe('低阶邪教徒');
    expect(entity?.rulesetId).toBe(COC_LITE_RULESET_ID);
  });

  it('可以解析规则书引用', () => {
    const entity = resolveRulebookRef({
      source: 'rulebook',
      rulesetId: COC_LITE_RULESET_ID,
      entityId: 'npc-frightened-witness',
    });
    expect(entity?.type).toBe('npc_template');
  });

  it('会根据实体、线索和理智损失估算场景风险', () => {
    const result = estimateCocSceneRisk({
      party: { investigatorCount: 2, experience: 'new' },
      entityRefs: [
        { rulesetId: COC_LITE_RULESET_ID, entityId: 'npc-cultist-basic', count: 2 },
        { rulesetId: COC_LITE_RULESET_ID, entityId: 'creature-minor-spirit', count: 1 },
      ],
      cluePlan: { essentialClues: 2, gatedClues: 2, alternatePaths: 0 },
      sanityLosses: ['1/1D6'],
      environmentHazards: ['黑暗', '封闭空间'],
    });
    expect(result.combatRisk === 'high' || result.combatRisk === 'deadly').toBe(true);
    expect(result.clueRisk).toBe('deadly');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('可以检查模组是否具备可玩性', () => {
    const report = validateCocModulePlayability(SAMPLE_SCRIPT);
    expect(report.isPlayable).toBe(true);
  });
});
