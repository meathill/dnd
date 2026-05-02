import { z } from 'zod';
import {
  listLocalArtifacts,
  saveLocalCharacterFile,
  saveLocalModuleFile,
  saveLocalReportFile,
  type LocalArtifactListItem,
  type LocalCharacterFile,
  type LocalModuleFile,
  type LocalReportMetadata,
} from './file-repository.ts';
import { arraySchema, GENERIC_OBJECT_SCHEMA, objectSchema, stringSchema } from './skill-contract.ts';
import {
  buildListItemSchema,
  buildLocalCharacterFileSchema,
  buildLocalModuleFileSchema,
  buildLocalReportMetadataSchema,
  createSkill,
  localArtifactSourceSchema,
  type SaveLocalCharacterResult,
  type SaveLocalModuleResult,
  type SaveLocalReportResult,
} from './skill-helpers.ts';
import type { CharacterRecord, ScriptDefinition } from '../game/types.ts';

const saveLocalModuleInputSchema = z.object({
  module: z.custom<ScriptDefinition>((value) => typeof value === 'object' && value !== null),
  source: localArtifactSourceSchema.optional(),
});

const saveLocalCharacterInputSchema = z.object({
  character: z.custom<CharacterRecord>((value) => typeof value === 'object' && value !== null),
  source: localArtifactSourceSchema.optional(),
});

const saveLocalReportInputSchema = z.object({
  title: z.string().min(1),
  moduleId: z.string().min(1),
  characterId: z.string().optional(),
  content: z.string().min(1),
  summary: z.string().optional(),
  source: localArtifactSourceSchema.optional(),
  reportId: z.string().optional(),
});

const listLocalArtifactsInputSchema = z.object({
  kind: z.enum(['module', 'character', 'report']),
});

type SaveLocalModuleInput = z.infer<typeof saveLocalModuleInputSchema>;
type SaveLocalCharacterInput = z.infer<typeof saveLocalCharacterInputSchema>;
type SaveLocalReportInput = z.infer<typeof saveLocalReportInputSchema>;
type ListLocalArtifactsInput = z.infer<typeof listLocalArtifactsInputSchema>;

export const saveLocalModuleSkill = createSkill<SaveLocalModuleInput, SaveLocalModuleResult>({
  name: 'save_local_module',
  version: 1,
  title: '保存模组到本地文件',
  description: '把结构化模组写入工作区 `data/modules`。',
  group: 'record',
  executionMode: 'native',
  whenToUse: ['模组草稿确认后需要落盘时。', 'AI 生成模组后需要写入工作区文件时。'],
  forbidden: ['只在自然语言里声称已保存，但没有真正写入文件。'],
  inputSchema: objectSchema(
    {
      module: GENERIC_OBJECT_SCHEMA,
      source: { type: 'string', enum: ['ai', 'manual', 'demo'], description: '产物来源，可留空。' },
    },
    ['module'],
    '模组落盘参数。',
  ),
  outputSchema: objectSchema(
    {
      filePath: stringSchema('写入的绝对文件路径。'),
      artifact: buildLocalModuleFileSchema('写入后的模组文件内容。'),
    },
    ['filePath', 'artifact'],
    '模组落盘结果。',
  ),
  parseInput: (input) => saveLocalModuleInputSchema.parse(input),
  execute: async (input, context) =>
    saveLocalModuleFile({ rootDir: context.rootDir, module: input.module, source: input.source }),
});

export const saveLocalCharacterSkill = createSkill<SaveLocalCharacterInput, SaveLocalCharacterResult>({
  name: 'save_local_character',
  version: 1,
  title: '保存人物卡到本地文件',
  description: '把结构化人物卡写入工作区 `data/characters`。',
  group: 'record',
  executionMode: 'native',
  whenToUse: ['角色创建完成后需要落盘时。', 'AI 生成或更新人物卡后需要写入工作区文件时。'],
  forbidden: ['只在上下文里临时持有角色，不做持久化。'],
  inputSchema: objectSchema(
    {
      character: GENERIC_OBJECT_SCHEMA,
      source: { type: 'string', enum: ['ai', 'manual', 'demo'], description: '产物来源，可留空。' },
    },
    ['character'],
    '人物卡落盘参数。',
  ),
  outputSchema: objectSchema(
    {
      filePath: stringSchema('写入的绝对文件路径。'),
      artifact: buildLocalCharacterFileSchema('写入后的人物卡文件内容。'),
    },
    ['filePath', 'artifact'],
    '人物卡落盘结果。',
  ),
  parseInput: (input) => saveLocalCharacterInputSchema.parse(input),
  execute: async (input, context) =>
    saveLocalCharacterFile({ rootDir: context.rootDir, character: input.character, source: input.source }),
});

export const saveLocalReportSkill = createSkill<SaveLocalReportInput, SaveLocalReportResult>({
  name: 'save_local_report',
  version: 1,
  title: '保存战报到本地文件',
  description: '把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。',
  group: 'record',
  executionMode: 'native',
  whenToUse: ['每轮或每段游戏总结后需要沉淀战报时。', '导出本地战报时。'],
  forbidden: ['只在对话里总结而不落盘。'],
  inputSchema: objectSchema(
    {
      title: stringSchema('战报标题。'),
      moduleId: stringSchema('所属模组 id。'),
      characterId: stringSchema('关联角色 id，可留空。'),
      content: stringSchema('Markdown 正文。'),
      summary: stringSchema('摘要，可留空。'),
      source: { type: 'string', enum: ['ai', 'manual', 'demo'], description: '产物来源，可留空。' },
      reportId: stringSchema('指定战报 id，可留空。'),
    },
    ['title', 'moduleId', 'content'],
    '战报落盘参数。',
  ),
  outputSchema: objectSchema(
    {
      filePath: stringSchema('写入的绝对文件路径。'),
      metadata: buildLocalReportMetadataSchema('写入后的战报元数据。'),
    },
    ['filePath', 'metadata'],
    '战报落盘结果。',
  ),
  parseInput: (input) => saveLocalReportInputSchema.parse(input),
  execute: async (input, context) => saveLocalReportFile({ rootDir: context.rootDir, ...input }),
});

export const listLocalArtifactsSkill = createSkill<ListLocalArtifactsInput, { items: LocalArtifactListItem[] }>({
  name: 'list_local_artifacts',
  version: 1,
  title: '列出本地产物',
  description: '列出工作区中已经保存的模组、人物卡或战报。',
  group: 'record',
  executionMode: 'native',
  whenToUse: ['需要查看当前工作区已有本地产物时。', '在保存前后确认持久化结果时。'],
  forbidden: ['重复生成已存在产物而不先检查。'],
  inputSchema: objectSchema(
    {
      kind: { type: 'string', enum: ['module', 'character', 'report'], description: '要列出的产物类型。' },
    },
    ['kind'],
    '本地产物列表参数。',
  ),
  outputSchema: objectSchema(
    {
      items: arraySchema(buildListItemSchema('本地产物摘要。'), '本地产物列表。'),
    },
    ['items'],
    '本地产物列表结果。',
  ),
  parseInput: (input) => listLocalArtifactsInputSchema.parse(input),
  execute: async (input, context) => ({
    items: await listLocalArtifacts({ rootDir: context.rootDir, kind: input.kind }),
  }),
});

export const recordSkills = [
  saveLocalModuleSkill,
  saveLocalCharacterSkill,
  saveLocalReportSkill,
  listLocalArtifactsSkill,
];

export type { LocalCharacterFile, LocalModuleFile, LocalReportMetadata };
