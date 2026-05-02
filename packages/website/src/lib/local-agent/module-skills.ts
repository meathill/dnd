import { z } from 'zod';
import {
  arraySchema,
  enumSchema,
  GENERIC_OBJECT_SCHEMA,
  nullableSchema,
  objectSchema,
  stringSchema,
} from './skill-contract.ts';
import { createSkill } from './skill-helpers.ts';

const roleSchema = z.enum(['ally', 'neutral', 'enemy']);

const patchBasicInputSchema = z
  .object({
    title: z.string().optional(),
    summary: z.string().optional(),
    setting: z.string().optional(),
    difficulty: z.string().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), '至少提供一个字段');

const patchBackgroundInputSchema = z
  .object({
    overview: z.string().optional(),
    truth: z.string().optional(),
    themes: z.array(z.string()).optional(),
    factions: z.array(z.string()).optional(),
    locations: z.array(z.string()).optional(),
    secrets: z.array(z.string()).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), '至少提供一个字段');

const patchNpcInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    role: roleSchema.optional(),
    threat: z.string().optional(),
    summary: z.string().optional(),
    useWhen: z.string().optional(),
    status: z.string().optional(),
    hp: z.number().optional(),
    armor: z.number().optional(),
    move: z.number().optional(),
    traits: z.array(z.string()).optional(),
    tactics: z.string().optional(),
    weakness: z.string().optional(),
    sanityLoss: z.string().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), '至少提供一个字段');

const removeNpcInputSchema = z.object({
  id: z.string().min(1),
});

const patchSceneInputSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    location: z.string().optional(),
    hooks: z.array(z.string()).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), '至少提供一个字段');

const removeSceneInputSchema = z.object({
  id: z.string().min(1),
});

const patchOptionsInputSchema = z
  .object({
    equipmentOptions: z.array(z.string()).optional(),
    originOptions: z.array(z.string()).optional(),
    buffOptions: z.array(z.string()).optional(),
    debuffOptions: z.array(z.string()).optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), '至少提供一个字段');

type PatchBasicInput = z.infer<typeof patchBasicInputSchema>;
type PatchBackgroundInput = z.infer<typeof patchBackgroundInputSchema>;
type PatchNpcInput = z.infer<typeof patchNpcInputSchema>;
type RemoveNpcInput = z.infer<typeof removeNpcInputSchema>;
type PatchSceneInput = z.infer<typeof patchSceneInputSchema>;
type RemoveSceneInput = z.infer<typeof removeSceneInputSchema>;
type PatchOptionsInput = z.infer<typeof patchOptionsInputSchema>;

type ModulePatchAction =
  | 'patch_basic'
  | 'patch_background'
  | 'patch_npc'
  | 'remove_npc'
  | 'patch_scene'
  | 'remove_scene'
  | 'patch_options';

type ModulePatchResult = {
  kind: 'module_patch';
  action: ModulePatchAction;
  targetType: 'script' | 'background' | 'npc' | 'scene' | 'options';
  targetId?: string;
  mode: 'create' | 'update' | 'remove';
  changedFields: string[];
  patch: Record<string, unknown>;
  summary: string;
};

function buildPatchResult(params: {
  action: ModulePatchAction;
  targetType: ModulePatchResult['targetType'];
  mode: ModulePatchResult['mode'];
  patch: Record<string, unknown>;
  summary: string;
  targetId?: string;
}): ModulePatchResult {
  return {
    kind: 'module_patch',
    action: params.action,
    targetType: params.targetType,
    ...(params.targetId ? { targetId: params.targetId } : {}),
    mode: params.mode,
    changedFields: Object.keys(params.patch).filter((key) => params.patch[key] !== undefined),
    patch: params.patch,
    summary: params.summary,
  };
}

function buildModulePatchSchema(description: string) {
  return objectSchema(
    {
      kind: { type: 'string', const: 'module_patch', description: '结果类型。' },
      action: enumSchema(
        ['patch_basic', 'patch_background', 'patch_npc', 'remove_npc', 'patch_scene', 'remove_scene', 'patch_options'],
        'patch 动作。',
      ),
      targetType: enumSchema(['script', 'background', 'npc', 'scene', 'options'], '修改目标类型。'),
      targetId: nullableSchema(stringSchema('目标 id；新增时可为空。')),
      mode: enumSchema(['create', 'update', 'remove'], '修改模式。'),
      changedFields: arraySchema(stringSchema('被修改字段。'), '变更字段列表。'),
      patch: GENERIC_OBJECT_SCHEMA,
      summary: stringSchema('中文摘要。'),
    },
    ['kind', 'action', 'targetType', 'mode', 'changedFields', 'patch', 'summary'],
    description,
  );
}

export const patchBasicSkill = createSkill<PatchBasicInput, ModulePatchResult>({
  name: 'patch_basic',
  version: 1,
  title: '修改模组基础信息',
  description: '修改模组的标题、简介、背景设定与难度，只返回结构化 patch 建议。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户要求调整模组标题、简介、设定或难度时。', '需要把散乱描述整理为基础信息时。'],
  forbidden: ['没有明确修改字段时瞎补内容。'],
  inputSchema: objectSchema(
    {
      title: stringSchema('模组标题。'),
      summary: stringSchema('模组简介。'),
      setting: stringSchema('背景设定。'),
      difficulty: stringSchema('难度描述。'),
    },
    [],
    '模组基础信息 patch 参数。',
  ),
  outputSchema: buildModulePatchSchema('模组基础信息 patch。'),
  parseInput: (input) => patchBasicInputSchema.parse(input),
  execute: (input) =>
    buildPatchResult({
      action: 'patch_basic',
      targetType: 'script',
      mode: 'update',
      patch: input,
      summary: `建议修改基础信息：${Object.keys(input).join('、')}`,
    }),
});

export const patchBackgroundSkill = createSkill<PatchBackgroundInput, ModulePatchResult>({
  name: 'patch_background',
  version: 1,
  title: '修改模组背景',
  description: '修改模组背景章节，包括总览、核心真相、主题、势力、地点和隐藏要点。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户要求补背景、核心真相、主题或隐藏信息时。', '需要把世界观信息整理成结构化背景时。'],
  forbidden: ['把未确认的候选设定直接当成既定事实。'],
  inputSchema: objectSchema(
    {
      overview: stringSchema('背景总览。'),
      truth: stringSchema('核心真相。'),
      themes: arraySchema(stringSchema('主题关键词。'), '主题列表。'),
      factions: arraySchema(stringSchema('势力。'), '势力列表。'),
      locations: arraySchema(stringSchema('关键地点。'), '关键地点列表。'),
      secrets: arraySchema(stringSchema('隐藏要点。'), '隐藏要点列表。'),
    },
    [],
    '模组背景 patch 参数。',
  ),
  outputSchema: buildModulePatchSchema('模组背景 patch。'),
  parseInput: (input) => patchBackgroundInputSchema.parse(input),
  execute: (input) =>
    buildPatchResult({
      action: 'patch_background',
      targetType: 'background',
      mode: 'update',
      patch: input,
      summary: `建议修改背景：${Object.keys(input).join('、')}`,
    }),
});

export const patchNpcSkill = createSkill<PatchNpcInput, ModulePatchResult>({
  name: 'patch_npc',
  version: 1,
  title: '新增或修改 NPC',
  description: '新增或更新一个 NPC，只返回结构化 patch 建议。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户要求补充、修改关键 NPC 时。', '需要把 NPC 设定整理为结构化档案时。'],
  forbidden: ['更新现有 NPC 时编造不存在的 id。'],
  inputSchema: objectSchema(
    {
      id: stringSchema('已有 NPC 的 id；新增时可省略。'),
      name: stringSchema('NPC 名称。'),
      type: stringSchema('NPC 类别。'),
      role: enumSchema(['ally', 'neutral', 'enemy'], '与玩家的关系。'),
      threat: stringSchema('威胁等级。'),
      summary: stringSchema('NPC 简介。'),
      useWhen: stringSchema('登场时机。'),
      status: stringSchema('当前状态。'),
      hp: { type: 'number', description: '生命值。' },
      armor: { type: 'number', description: '护甲。' },
      move: { type: 'number', description: '移动。' },
      traits: arraySchema(stringSchema('特性。'), '特性列表。'),
      tactics: stringSchema('战术。'),
      weakness: stringSchema('弱点。'),
      sanityLoss: stringSchema('理智损失。'),
    },
    [],
    'NPC patch 参数。',
  ),
  outputSchema: buildModulePatchSchema('NPC patch。'),
  parseInput: (input) => patchNpcInputSchema.parse(input),
  execute: (input) => {
    const { id, ...patch } = input;
    const mode = id ? 'update' : 'create';
    return buildPatchResult({
      action: 'patch_npc',
      targetType: 'npc',
      targetId: id,
      mode,
      patch,
      summary: id ? `建议更新 NPC：${input.name ?? id}` : `建议新增 NPC：${input.name ?? '未命名'}`,
    });
  },
});

export const removeNpcSkill = createSkill<RemoveNpcInput, ModulePatchResult>({
  name: 'remove_npc',
  version: 1,
  title: '删除 NPC',
  description: '删除指定 id 的 NPC，只返回结构化删除建议。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户明确要求移除某个 NPC 时。'],
  forbidden: ['不明确目标 id 时误删 NPC。'],
  inputSchema: objectSchema(
    {
      id: stringSchema('要删除的 NPC id。'),
    },
    ['id'],
    'NPC 删除参数。',
  ),
  outputSchema: buildModulePatchSchema('NPC 删除 patch。'),
  parseInput: (input) => removeNpcInputSchema.parse(input),
  execute: (input) =>
    buildPatchResult({
      action: 'remove_npc',
      targetType: 'npc',
      targetId: input.id,
      mode: 'remove',
      patch: {},
      summary: `建议移除 NPC（id=${input.id}）`,
    }),
});

export const patchSceneSkill = createSkill<PatchSceneInput, ModulePatchResult>({
  name: 'patch_scene',
  version: 1,
  title: '新增或修改场景',
  description: '新增或更新一个场景，只返回结构化 patch 建议。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户要求补场景、重写场景或调整线索钩子时。'],
  forbidden: ['更新现有场景时编造不存在的 id。'],
  inputSchema: objectSchema(
    {
      id: stringSchema('已有场景 id；新增时可省略。'),
      title: stringSchema('场景标题。'),
      summary: stringSchema('场景简介。'),
      location: stringSchema('场景地点。'),
      hooks: arraySchema(stringSchema('引导钩子。'), '引导钩子列表。'),
    },
    [],
    '场景 patch 参数。',
  ),
  outputSchema: buildModulePatchSchema('场景 patch。'),
  parseInput: (input) => patchSceneInputSchema.parse(input),
  execute: (input) => {
    const { id, ...patch } = input;
    return buildPatchResult({
      action: 'patch_scene',
      targetType: 'scene',
      targetId: id,
      mode: id ? 'update' : 'create',
      patch,
      summary: id ? `建议更新场景：${input.title ?? id}` : `建议新增场景：${input.title ?? '未命名'}`,
    });
  },
});

export const removeSceneSkill = createSkill<RemoveSceneInput, ModulePatchResult>({
  name: 'remove_scene',
  version: 1,
  title: '删除场景',
  description: '删除指定 id 的场景，只返回结构化删除建议。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户明确要求移除某个场景时。'],
  forbidden: ['不明确目标 id 时误删场景。'],
  inputSchema: objectSchema(
    {
      id: stringSchema('要删除的场景 id。'),
    },
    ['id'],
    '场景删除参数。',
  ),
  outputSchema: buildModulePatchSchema('场景删除 patch。'),
  parseInput: (input) => removeSceneInputSchema.parse(input),
  execute: (input) =>
    buildPatchResult({
      action: 'remove_scene',
      targetType: 'scene',
      targetId: input.id,
      mode: 'remove',
      patch: {},
      summary: `建议移除场景（id=${input.id}）`,
    }),
});

export const patchOptionsSkill = createSkill<PatchOptionsInput, ModulePatchResult>({
  name: 'patch_options',
  version: 1,
  title: '修改模组选项池',
  description: '修改模组的装备、出身、buff、debuff 选项池，只返回结构化 patch 建议。',
  group: 'module',
  executionMode: 'native',
  whenToUse: ['用户要求调整可选装备、出身、buff 或 debuff 时。'],
  forbidden: ['把增量 patch 误当成追加，导致列表语义不清。'],
  inputSchema: objectSchema(
    {
      equipmentOptions: arraySchema(stringSchema('装备选项。'), '装备选项列表。'),
      originOptions: arraySchema(stringSchema('出身选项。'), '出身选项列表。'),
      buffOptions: arraySchema(stringSchema('buff 选项。'), 'buff 选项列表。'),
      debuffOptions: arraySchema(stringSchema('debuff 选项。'), 'debuff 选项列表。'),
    },
    [],
    '模组选项池 patch 参数。',
  ),
  outputSchema: buildModulePatchSchema('模组选项池 patch。'),
  parseInput: (input) => patchOptionsInputSchema.parse(input),
  execute: (input) =>
    buildPatchResult({
      action: 'patch_options',
      targetType: 'options',
      mode: 'update',
      patch: input,
      summary: `建议更新选项池：${Object.keys(input).join('、')}`,
    }),
});

export const moduleSkills = [
  patchBasicSkill,
  patchBackgroundSkill,
  patchNpcSkill,
  removeNpcSkill,
  patchSceneSkill,
  removeSceneSkill,
  patchOptionsSkill,
];
