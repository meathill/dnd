import { z } from 'zod';
import {
  COC_LITE_RULESET_ID,
  type CocModulePlayabilityReport,
  type CocSceneRiskEstimate,
  estimateCocSceneRisk,
  getRulebookEntity,
  listRulesets,
  searchRulebook,
  validateCocModulePlayability,
} from '../game/rulebook.ts';
import type { RulebookEntity, ScriptDefinition } from '../game/types.ts';
import {
  arraySchema,
  enumSchema,
  GENERIC_OBJECT_SCHEMA,
  integerSchema,
  nullableSchema,
  objectSchema,
  stringSchema,
} from './skill-contract.ts';
import {
  buildRulebookEntitySchema,
  createSkill,
  rulebookEntityTypeSchema,
  sceneRiskLevelSchema,
  toSerializableRulebookEntity,
} from './skill-helpers.ts';

const searchRulebookInputSchema = z.object({
  rulesetId: z.string().optional(),
  query: z.string().optional(),
  type: z
    .enum([
      'rule',
      'skill',
      'occupation_template',
      'npc_template',
      'creature',
      'hazard',
      'sanity_loss',
      'scene_risk_guideline',
    ])
    .optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const getRuleEntryInputSchema = z.object({
  rulesetId: z.string().optional(),
  entityId: z.string().min(1),
});

const estimateSceneRiskInputSchema = z.object({
  rulesetId: z.string().optional(),
  party: z
    .object({
      investigatorCount: z.number().int().min(1).max(12).optional(),
      experience: z.enum(['new', 'standard', 'veteran']).optional(),
    })
    .optional(),
  entityRefs: z
    .array(
      z.object({
        entityId: z.string().min(1),
        rulesetId: z.string().optional(),
        count: z.number().int().min(1).max(20).optional(),
      }),
    )
    .optional(),
  cluePlan: z
    .object({
      essentialClues: z.number().int().min(0).optional(),
      gatedClues: z.number().int().min(0).optional(),
      alternatePaths: z.number().int().min(0).optional(),
    })
    .optional(),
  sanityLosses: z.array(z.string()).optional(),
  environmentHazards: z.array(z.string()).optional(),
});

const validateModuleInputSchema = z.object({
  module: z.custom<ScriptDefinition>((value) => typeof value === 'object' && value !== null),
});

type SearchRulebookInput = z.infer<typeof searchRulebookInputSchema>;
type GetRuleEntryInput = z.infer<typeof getRuleEntryInputSchema>;
type EstimateSceneRiskInput = z.infer<typeof estimateSceneRiskInputSchema>;
type ValidateModuleInput = z.infer<typeof validateModuleInputSchema>;

export const selectRulesetSkill = createSkill<
  undefined,
  { rulesets: Array<{ id: string; name: string; summary: string }>; defaultRulesetId: string }
>({
  name: 'select_ruleset',
  version: 1,
  title: '选择规则系统',
  description: '列出当前可用规则系统，默认返回 coc-7e-lite。',
  group: 'rulebook',
  executionMode: 'native',
  whenToUse: ['开始制作模组前确认当前规则系统。', '用户未明确说明规则系统时回到 COC 默认值。'],
  forbidden: ['把模组特例误当作规则书默认规则。'],
  inputSchema: objectSchema({}, [], '无需参数。'),
  outputSchema: objectSchema(
    {
      rulesets: arraySchema(
        objectSchema(
          {
            id: stringSchema('规则系统 id。'),
            name: stringSchema('规则系统名称。'),
            summary: stringSchema('规则系统简介。'),
          },
          ['id', 'name', 'summary'],
          '规则系统摘要。',
        ),
        '规则系统列表。',
      ),
      defaultRulesetId: stringSchema('默认规则系统 id。'),
    },
    ['rulesets', 'defaultRulesetId'],
    '规则系统选择结果。',
  ),
  parseInput: () => undefined,
  execute: () => ({
    rulesets: listRulesets().map((ruleset) => ({ id: ruleset.id, name: ruleset.name, summary: ruleset.summary })),
    defaultRulesetId: COC_LITE_RULESET_ID,
  }),
});

export const searchRulebookSkill = createSkill<SearchRulebookInput, { items: RulebookEntity[] }>({
  name: 'search_rulebook',
  version: 1,
  title: '搜索规则书实体',
  description: '搜索 COC 最小规则库中的技能、模板、怪物和规则条目。',
  group: 'rulebook',
  executionMode: 'native',
  whenToUse: ['需要标准技能、职业、怪物或 NPC 模板时。', '模组制作中需要确认标准条目而不是自己硬编时。'],
  forbidden: ['规则书已经有标准实体时，重新编造一套不一致的数据。', '导入商业规则书全文。'],
  inputSchema: objectSchema(
    {
      rulesetId: stringSchema('规则系统 id，可留空。'),
      query: stringSchema('搜索关键字，可留空。'),
      type: rulebookEntityTypeSchema,
      tags: arraySchema(stringSchema('标签。'), '标签过滤。'),
      limit: integerSchema('最大返回数量。', { minimum: 1, maximum: 50 }),
    },
    [],
    '规则书搜索参数。',
  ),
  outputSchema: objectSchema(
    {
      items: arraySchema(buildRulebookEntitySchema('命中的规则书实体。'), '规则书实体列表。'),
    },
    ['items'],
    '规则书搜索结果。',
  ),
  parseInput: (input) => searchRulebookInputSchema.parse(input),
  execute: (input) => ({ items: searchRulebook(input).map(toSerializableRulebookEntity) }),
});

export const getRuleEntrySkill = createSkill<GetRuleEntryInput, { item: RulebookEntity | null }>({
  name: 'get_rule_entry',
  version: 1,
  title: '读取规则书实体',
  description: '按 id 读取单个规则说明、技能条目、模板或怪物档案。',
  group: 'rulebook',
  executionMode: 'native',
  whenToUse: ['搜索到条目后需要读取完整结构化结果时。', '游戏中需要解释标准规则、标准 NPC 或怪物能力时。'],
  forbidden: ['不查档案就自由发挥关键规则实体。'],
  inputSchema: objectSchema(
    {
      rulesetId: stringSchema('规则系统 id，可留空。'),
      entityId: stringSchema('规则书实体 id。'),
    },
    ['entityId'],
    '规则书实体读取参数。',
  ),
  outputSchema: objectSchema(
    {
      item: nullableSchema(buildRulebookEntitySchema('命中的规则书实体；若未命中则为 null。')),
    },
    ['item'],
    '规则书实体读取结果。',
  ),
  parseInput: (input) => getRuleEntryInputSchema.parse(input),
  execute: (input) => ({
    item: (() => {
      const entity = getRulebookEntity(input.entityId, input.rulesetId?.trim() || COC_LITE_RULESET_ID);
      return entity ? toSerializableRulebookEntity(entity) : null;
    })(),
  }),
});

export const getStandardNpcSkill = createSkill<GetRuleEntryInput, { item: RulebookEntity | null }>({
  ...getRuleEntrySkill,
  name: 'get_standard_npc',
  title: '读取标准 NPC 模板',
  description: '读取规则书中的标准 NPC 模板。',
  whenToUse: ['需要标准 NPC 模板时。', '模组中需要快速引用新手友好的标准人类对手或证人模板时。'],
  execute: (input) => {
    const entity = getRulebookEntity(input.entityId, input.rulesetId?.trim() || COC_LITE_RULESET_ID);
    if (!entity || entity.type !== 'npc_template') {
      return { item: null };
    }
    return { item: toSerializableRulebookEntity(entity) };
  },
});

export const getCreatureProfileSkill = createSkill<GetRuleEntryInput, { item: RulebookEntity | null }>({
  ...getRuleEntrySkill,
  name: 'get_creature_profile',
  title: '读取怪物模板',
  description: '读取规则书中的怪物或超自然威胁模板。',
  whenToUse: ['需要怪物/威胁模板时。', '评估超自然场景的战斗和理智压力时。'],
  execute: (input) => {
    const entity = getRulebookEntity(input.entityId, input.rulesetId?.trim() || COC_LITE_RULESET_ID);
    if (!entity || entity.type !== 'creature') {
      return { item: null };
    }
    return { item: toSerializableRulebookEntity(entity) };
  },
});

export const estimateSceneRiskSkill = createSkill<EstimateSceneRiskInput, CocSceneRiskEstimate>({
  name: 'estimate_scene_risk',
  version: 1,
  title: '评估场景风险',
  description: '根据规则书引用、线索门槛与理智损失估算 COC 场景风险。',
  group: 'rulebook',
  executionMode: 'native',
  whenToUse: ['制作模组时判断场景风险是否超标。', '需要估算战斗风险、理智风险和卡关风险时。'],
  forbidden: ['忽略关键线索门槛造成的卡关风险。'],
  inputSchema: objectSchema(
    {
      rulesetId: stringSchema('规则系统 id，可留空。'),
      party: objectSchema(
        {
          investigatorCount: integerSchema('调查员人数。', { minimum: 1, maximum: 12 }),
          experience: enumSchema(['new', 'standard', 'veteran'], '玩家经验水平。'),
        },
        [],
        '玩家队伍配置。',
      ),
      entityRefs: arraySchema(
        objectSchema(
          {
            entityId: stringSchema('规则书实体 id。'),
            rulesetId: stringSchema('规则系统 id，可留空。'),
            count: integerSchema('数量。', { minimum: 1, maximum: 20 }),
          },
          ['entityId'],
          '参与风险评估的规则书引用。',
        ),
        '规则书引用列表。',
      ),
      cluePlan: objectSchema(
        {
          essentialClues: integerSchema('关键线索数。', { minimum: 0 }),
          gatedClues: integerSchema('需要检定或门槛的关键线索数。', { minimum: 0 }),
          alternatePaths: integerSchema('替代获取路径数量。', { minimum: 0 }),
        },
        [],
        '线索门槛计划。',
      ),
      sanityLosses: arraySchema(stringSchema('理智损失表达式，例如 1/1D6。'), '额外理智损失列表。'),
      environmentHazards: arraySchema(stringSchema('环境危险。'), '环境危险列表。'),
    },
    [],
    '场景风险评估参数。',
  ),
  outputSchema: objectSchema(
    {
      rulesetId: stringSchema('规则系统 id。'),
      combatRisk: sceneRiskLevelSchema,
      sanityRisk: sceneRiskLevelSchema,
      clueRisk: sceneRiskLevelSchema,
      overallRisk: sceneRiskLevelSchema,
      referencedEntities: arraySchema(
        objectSchema(
          {
            entityId: stringSchema('规则书实体 id。'),
            name: stringSchema('实体名称。'),
            type: rulebookEntityTypeSchema,
            count: integerSchema('数量。', { minimum: 1 }),
          },
          ['entityId', 'name', 'type', 'count'],
          '参与评估的规则书实体。',
        ),
        '引用实体列表。',
      ),
      warnings: arraySchema(stringSchema('警告。'), '风险警告列表。'),
      suggestions: arraySchema(stringSchema('建议。'), '缓解建议列表。'),
    },
    [
      'rulesetId',
      'combatRisk',
      'sanityRisk',
      'clueRisk',
      'overallRisk',
      'referencedEntities',
      'warnings',
      'suggestions',
    ],
    '场景风险评估结果。',
  ),
  parseInput: (input) => estimateSceneRiskInputSchema.parse(input),
  execute: (input) => estimateCocSceneRisk(input),
});

export const validateModulePlayabilitySkill = createSkill<ValidateModuleInput, CocModulePlayabilityReport>({
  name: 'validate_module_playability',
  version: 1,
  title: '检查模组可玩性',
  description: '检查模组是否具备开场、场景、探索区域、隐藏真相和推进节点。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['模组草稿整理完成后做可玩性验收。', '开团前确认不会因为缺线索或缺场景直接卡死。'],
  forbidden: ['模组信息不足时直接开团。'],
  inputSchema: objectSchema(
    {
      module: GENERIC_OBJECT_SCHEMA,
    },
    ['module'],
    '模组可玩性校验参数。',
  ),
  outputSchema: objectSchema(
    {
      isPlayable: { type: 'boolean', description: '是否达到最小可玩性。' },
      warnings: arraySchema(stringSchema('警告。'), '问题列表。'),
      suggestions: arraySchema(stringSchema('建议。'), '修复建议列表。'),
    },
    ['isPlayable', 'warnings', 'suggestions'],
    '模组可玩性校验结果。',
  ),
  parseInput: (input) => validateModuleInputSchema.parse(input),
  execute: (input) => validateCocModulePlayability(input.module),
});

export const rulebookSkills = [
  selectRulesetSkill,
  searchRulebookSkill,
  getRuleEntrySkill,
  getStandardNpcSkill,
  getCreatureProfileSkill,
  estimateSceneRiskSkill,
  validateModulePlayabilitySkill,
];
