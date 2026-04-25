import { tool } from '@openai/agents';
import { z } from 'zod';

// 这些工具只负责把 AI 提出的草稿修改结构化地透传给前端，不会直接落库。
// 前端通过 tool_call 事件拿到参数，渲染成「修改建议卡」，由用户确认后再应用到本地 ScriptDraft。
// execute 只做轻量校验并返回一条中文摘要字符串供 UI 展示。

const roleSchema = z.enum(['ally', 'neutral', 'enemy']);

export const patchBasicTool = tool({
  name: 'patch_basic',
  description: '修改剧本的基础信息（标题、简介、背景设定、难度）。只传需要改的字段。',
  parameters: z.object({
    title: z.string().optional().describe('剧本标题'),
    summary: z.string().optional().describe('剧本简介'),
    setting: z.string().optional().describe('背景设定，例如"1920 年代新英格兰"'),
    difficulty: z.string().optional().describe('难度描述，例如"入门"、"进阶"'),
  }),
  execute: async (args) => {
    const fields = Object.keys(args).filter((key) => args[key as keyof typeof args] !== undefined);
    return `建议修改基础信息：${fields.join('、') || '无字段'}`;
  },
});

export const patchBackgroundTool = tool({
  name: 'patch_background',
  description: '修改剧本背景章节（总览、核心真相、主题、势力、关键地点、隐藏要点）。列表字段请传数组，后端会替换整个列表。',
  parameters: z.object({
    overview: z.string().optional().describe('背景总览，多段可用 \\n\\n 分隔'),
    truth: z.string().optional().describe('核心真相（对玩家隐藏）'),
    themes: z.array(z.string()).optional().describe('主题关键词列表'),
    factions: z.array(z.string()).optional().describe('势力列表'),
    locations: z.array(z.string()).optional().describe('关键地点列表'),
    secrets: z.array(z.string()).optional().describe('隐藏要点列表'),
  }),
  execute: async (args) => {
    const fields = Object.keys(args).filter((key) => args[key as keyof typeof args] !== undefined);
    return `建议修改背景：${fields.join('、') || '无字段'}`;
  },
});

export const patchNpcTool = tool({
  name: 'patch_npc',
  description:
    '新增或更新一个 NPC。如果传了已有的 id，则更新该 NPC；不传 id 视为新增。只需提供需要改写的字段。',
  parameters: z.object({
    id: z.string().optional().describe('已存在 NPC 的 id；留空表示新增'),
    name: z.string().optional(),
    type: z.string().optional().describe('NPC 类别，例如"学者"、"怪物"'),
    role: roleSchema.optional().describe('与玩家的关系'),
    threat: z.string().optional().describe('威胁等级的短描述'),
    summary: z.string().optional().describe('NPC 简介'),
    useWhen: z.string().optional().describe('登场时机'),
    status: z.string().optional().describe('当前状态'),
    hp: z.number().optional(),
    armor: z.number().optional(),
    move: z.number().optional(),
    traits: z.array(z.string()).optional().describe('特性列表'),
    tactics: z.string().optional().describe('战术'),
    weakness: z.string().optional().describe('弱点'),
    sanityLoss: z.string().optional().describe('理智损失，例如"1/1D6"'),
  }),
  execute: async (args) => {
    if (args.id) {
      return `建议更新 NPC：${args.name ?? args.id}`;
    }
    return `建议新增 NPC：${args.name ?? '未命名'}`;
  },
});

export const removeNpcTool = tool({
  name: 'remove_npc',
  description: '删除指定 id 的 NPC。',
  parameters: z.object({
    id: z.string().describe('要删除的 NPC id'),
  }),
  execute: async (args) => `建议移除 NPC（id=${args.id}）`,
});

export const patchSceneTool = tool({
  name: 'patch_scene',
  description: '新增或更新一个场景。传已有的 id 表示更新，留空表示新增。',
  parameters: z.object({
    id: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    location: z.string().optional(),
    hooks: z.array(z.string()).optional().describe('引导钩子列表'),
  }),
  execute: async (args) => {
    if (args.id) {
      return `建议更新场景：${args.title ?? args.id}`;
    }
    return `建议新增场景：${args.title ?? '未命名'}`;
  },
});

export const removeSceneTool = tool({
  name: 'remove_scene',
  description: '删除指定 id 的场景。',
  parameters: z.object({
    id: z.string().describe('要删除的场景 id'),
  }),
  execute: async (args) => `建议移除场景（id=${args.id}）`,
});

export const patchOptionsTool = tool({
  name: 'patch_options',
  description: '修改剧本的选项池（装备、出身、buff、debuff）。列表字段会整体替换。',
  parameters: z.object({
    equipmentOptions: z.array(z.string()).optional(),
    originOptions: z.array(z.string()).optional(),
    buffOptions: z.array(z.string()).optional(),
    debuffOptions: z.array(z.string()).optional(),
  }),
  execute: async (args) => {
    const fields = Object.keys(args).filter((key) => args[key as keyof typeof args] !== undefined);
    return `建议更新选项池：${fields.join('、') || '无字段'}`;
  },
});

export const scriptEditorTools = [
  patchBasicTool,
  patchBackgroundTool,
  patchNpcTool,
  removeNpcTool,
  patchSceneTool,
  removeSceneTool,
  patchOptionsTool,
];
