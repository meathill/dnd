import { tool } from '@openai/agents';
import { z } from 'zod';
import {
  DEFAULT_CHECK_DC,
  checkAttribute,
  checkLuck,
  checkSanity,
  checkSkill,
  resolveCheckDc,
  resolveTrainedSkillValue,
  resolveUntrainedSkillValue,
  rollDie,
} from '../game/rules';
import type { GameAgentContext } from './dm-agent';

// ============================================================================
// roll_dice —— 跑团灵魂技能
// 当 DM 判定玩家需要进行检定时（技能检定、属性检定、幸运、理智、攻击等），
// 由 Agent 自主决定调用此工具。纯数学计算，零外部依赖。
// ============================================================================

const checkTypeSchema = z.enum(['skill', 'attribute', 'luck', 'sanity', 'combat']);
const difficultySchema = z.enum(['normal', 'hard', 'extreme']);

const attributeAliasMap: Record<string, string> = {
  力量: 'strength',
  敏捷: 'dexterity',
  体质: 'constitution',
  体型: 'size',
  智力: 'intelligence',
  意志: 'willpower',
  外貌: 'appearance',
  教育: 'education',
  strength: 'strength',
  dexterity: 'dexterity',
  constitution: 'constitution',
  size: 'size',
  intelligence: 'intelligence',
  willpower: 'willpower',
  appearance: 'appearance',
  education: 'education',
};

function resolveAttributeValue(
  character: GameAgentContext['character'],
  label: string,
): number | null {
  const key = attributeAliasMap[label.trim()];
  if (!key) {
    return null;
  }
  const value = character.attributes[key as keyof typeof character.attributes];
  return typeof value === 'number' ? value : null;
}

function resolveSkillId(
  script: GameAgentContext['script'],
  label: string,
): string | null {
  const trimmed = label.trim();
  if (!trimmed) {
    return null;
  }
  const byId = script.skillOptions.find((option) => option.id === trimmed);
  if (byId) {
    return byId.id;
  }
  const byLabel = script.skillOptions.find((option) => option.label === trimmed);
  return byLabel ? byLabel.id : null;
}

function resolveSkillValue(
  character: GameAgentContext['character'],
  script: GameAgentContext['script'],
  skillId: string,
): number {
  const rawValue = (character.skills as Record<string, unknown>)[skillId];
  if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
    return rawValue;
  }
  const trainedValue = resolveTrainedSkillValue(script.rules);
  const untrainedValue = resolveUntrainedSkillValue(script.rules);
  if (typeof rawValue === 'boolean') {
    return rawValue ? trainedValue : untrainedValue;
  }
  const baseValue = script.rules.skillBaseValues?.[skillId];
  if (typeof baseValue === 'number' && Number.isFinite(baseValue)) {
    return baseValue;
  }
  return untrainedValue;
}

export const rollDiceTool = tool({
  name: 'roll_dice',
  description: `执行 COC 跑团中的骰子检定。当玩家的行为需要掷骰判定时调用此工具。
支持的检定类型：
- skill：技能检定（如侦查、图书馆、说服等）
- attribute：属性检定（如力量、敏捷、智力等）
- luck：幸运检定
- sanity：理智检定
- combat：战斗技能检定（如射击、格斗等）
返回格式化的判定结果文本，包含掷骰值、阈值和成功/失败。`,
  parameters: z.object({
    checkType: checkTypeSchema.describe('检定类型'),
    target: z.string().describe('检定目标：技能名称（如"侦查"）或属性名称（如"力量"）'),
    difficulty: difficultySchema.default('normal').describe('难度等级'),
    reason: z.string().optional().describe('检定原因的简要说明'),
  }),
  execute: async (args, runContext) => {
    const { script, character, gameRules } = (runContext?.context as GameAgentContext);
    const { checkType, target, difficulty, reason } = args;

    const checkKey = buildCheckKey(checkType, target, script);
    const { dc } = resolveCheckDc({
      targetKey: checkKey,
      scriptRules: script.rules,
      gameOverrides: gameRules?.checkDcOverrides,
    });

    let result;
    let label: string;
    let baseLabel: string;
    let baseValue: number;

    if (checkType === 'luck') {
      baseValue = character.luck ?? 0;
      result = checkLuck(dc, baseValue, difficulty);
      label = '幸运';
      baseLabel = '幸运值';
    } else if (checkType === 'sanity') {
      baseValue = Math.max(0, Math.floor(character.attributes.willpower ?? 0));
      result = checkSanity(dc, baseValue, difficulty);
      label = '理智';
      baseLabel = '理智值';
    } else if (checkType === 'attribute') {
      label = target.trim() || '属性';
      baseValue = resolveAttributeValue(character, target) ?? 0;
      result = checkAttribute(dc, baseValue, difficulty);
      baseLabel = '属性值';
    } else {
      // skill / combat
      const skillId = resolveSkillId(script, target) ?? target.trim();
      const skillLabel = script.skillOptions.find(
        (opt) => opt.id === skillId,
      )?.label ?? target.trim();
      label = skillLabel || '技能';
      baseValue = skillId
        ? resolveSkillValue(character, script, skillId)
        : resolveUntrainedSkillValue(script.rules);
      result = checkSkill(dc, baseValue, difficulty);
      baseLabel = '技能值';
    }

    const reasonText = reason ? `（${reason}）` : '';
    const dcText = dc === DEFAULT_CHECK_DC ? '' : `，DC ${dc}`;
    const output = `${label}检定${reasonText} 1D100 → ${result.roll} / ${result.threshold}，${result.outcome}（${result.difficultyLabel}，${baseLabel} ${baseValue}${dcText}）`;

    return output;
  },
});

function buildCheckKey(
  checkType: string,
  target: string,
  script: GameAgentContext['script'],
): string {
  if (checkType === 'luck') {
    return 'luck';
  }
  if (checkType === 'sanity') {
    return 'sanity';
  }
  if (checkType === 'attribute') {
    const attrKey = attributeAliasMap[target.trim()];
    return `attribute:${attrKey ?? target.trim()}`;
  }
  const skillId = resolveSkillId(script, target) ?? target.trim();
  return `skill:${skillId}`;
}

// ============================================================================
// create_temp_npc —— 临时 NPC 生成
// Agent 提供人设骨架，工具用 3D6×5 生成属性，返回结构化 NPC 卡
// ============================================================================

function rollAttribute3d6(): number {
  return (rollDie(6) + rollDie(6) + rollDie(6)) * 5;
}

function rollAttribute2d6p6(): number {
  return (rollDie(6) + rollDie(6) + 6) * 5;
}

export const createTempNpcTool = tool({
  name: 'create_temp_npc',
  description: `为剧本中未预设的临时 NPC 生成一张即时人物卡（如路边酒保、小混混、目击证人）。
你需要提供 NPC 的基本人设（姓名、职业、性格关键词等），工具会用 COC 规则自动掷出六维属性和 HP。
生成完成后该 NPC 就固定下来，供你后续扮演与检定使用。`,
  parameters: z.object({
    name: z.string().describe('NPC 姓名'),
    occupation: z.string().describe('职业或身份，如"酒保""小偷"'),
    role: z.enum(['ally', 'neutral', 'enemy']).default('neutral').describe('与玩家的关系'),
    personality: z.string().describe('1-2 句人物性格或行为特征'),
    appearance: z.string().optional().describe('外貌简述'),
  }),
  execute: async (args) => {
    const strength = rollAttribute3d6();
    const dexterity = rollAttribute3d6();
    const constitution = rollAttribute3d6();
    const size = rollAttribute2d6p6();
    const intelligence = rollAttribute2d6p6();
    const willpower = rollAttribute3d6();
    const appearance = rollAttribute3d6();
    const education = rollAttribute2d6p6();
    const hp = Math.floor((constitution + size) / 10);

    const npc = {
      name: args.name,
      occupation: args.occupation,
      role: args.role,
      personality: args.personality,
      appearance: args.appearance ?? '',
      attributes: {
        strength,
        dexterity,
        constitution,
        size,
        intelligence,
        willpower,
        appearance,
        education,
      },
      hp,
      generatedAt: new Date().toISOString(),
    };

    return JSON.stringify({ kind: 'temp_npc', npc });
  },
});

// ============================================================================
// roleplay_npc —— 调取剧本预设 NPC 档案
// Agent 扮演关键 NPC 前先取档，避免设定漂移
// ============================================================================

export const roleplayNpcTool = tool({
  name: 'roleplay_npc',
  description: `当你需要扮演剧本中已存在的关键 NPC（非临时 NPC）时，先调用此工具取出该 NPC 的完整档案。
返回内容包括性格、战斗属性、战术、弱点等，帮助你保持扮演一致。`,
  parameters: z.object({
    nameOrId: z.string().describe('NPC 的 id 或姓名'),
  }),
  execute: async (args, runContext) => {
    const { script } = (runContext?.context as GameAgentContext);
    const query = args.nameOrId.trim();
    const profile =
      script.npcProfiles.find((npc) => npc.id === query) ??
      script.npcProfiles.find((npc) => npc.name === query) ??
      script.npcProfiles.find((npc) => npc.name.includes(query));
    if (!profile) {
      return JSON.stringify({ kind: 'roleplay_npc', error: `未找到名为 "${query}" 的 NPC 档案` });
    }
    return JSON.stringify({ kind: 'roleplay_npc', npc: profile });
  },
});

// ============================================================================
// draw_map / draw_character_art —— OpenAI 图像生成
// Edge Runtime 中通过注入的 generateImage 回调访问 OpenAI Images API
// ============================================================================

const imageSizeSchema = z.enum(['1024x1024', '1536x1024', '1024x1536']).default('1024x1024');

async function runImageGeneration(
  context: GameAgentContext,
  prompt: string,
  size: '1024x1024' | '1536x1024' | '1024x1536',
  kind: 'map' | 'character_art',
  caption: string,
): Promise<string> {
  if (!context.generateImage) {
    return JSON.stringify({ kind, error: '当前部署未配置图像生成能力' });
  }
  try {
    const result = await context.generateImage({ prompt, size });
    return JSON.stringify({
      kind,
      caption,
      prompt,
      size,
      b64: result.b64,
      url: result.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '图像生成失败';
    return JSON.stringify({ kind, error: message });
  }
}

export const drawMapTool = tool({
  name: 'draw_map',
  description: `当玩家进入新区域或需要直观展示地形环境时调用，生成一张地图插画。
请用英文给出具体的场景描述（建筑布局、光照、风格），配合 COC 克苏鲁氛围。
可选比例：1024x1024（方形）、1536x1024（横版全景，推荐）、1024x1536（竖版）。`,
  parameters: z.object({
    prompt: z.string().describe('完整的英文图像描述，越具体越好'),
    caption: z.string().describe('向玩家展示的中文地点/场景标题'),
    size: imageSizeSchema.describe('图像比例'),
  }),
  execute: async (args, runContext) => {
    const prompt = `Hand-drawn tabletop RPG map illustration, top-down or isometric view, Cthulhu horror tone, ink and parchment aesthetic. ${args.prompt}`;
    return runImageGeneration(
      (runContext?.context as GameAgentContext),
      prompt,
      args.size,
      'map',
      args.caption,
    );
  },
});

export const drawCharacterArtTool = tool({
  name: 'draw_character_art',
  description: `作为"大成功"暴击或重要剧情节点的视觉奖励，为角色、NPC 或生物绘制立绘。
请用英文提供人物/生物的外貌、服饰、气质细节。
可选比例：1024x1024、1024x1536（竖版，推荐立绘使用）、1536x1024。`,
  parameters: z.object({
    prompt: z.string().describe('完整的英文图像描述'),
    caption: z.string().describe('向玩家展示的中文角色/场景标题'),
    size: imageSizeSchema.describe('图像比例'),
  }),
  execute: async (args, runContext) => {
    const prompt = `Moody character portrait illustration, painterly style, cinematic lighting, 1920s Cthulhu mythos vibe. ${args.prompt}`;
    return runImageGeneration(
      (runContext?.context as GameAgentContext),
      prompt,
      args.size,
      'character_art',
      args.caption,
    );
  },
});

// 导出所有 DM 技能
export const dmTools = [rollDiceTool, createTempNpcTool, roleplayNpcTool, drawMapTool, drawCharacterArtTool];
