import { Agent } from '@openai/agents';
import type { CharacterRecord, GameRuleOverrides, ScriptDefinition } from '../game/types';
import { dmTools } from './dm-tools';
import {
  resolveTrainedSkillValue,
  resolveUntrainedSkillValue,
} from '../game/rules';

// ============================================================================
// GameAgentContext —— Agent 运行时上下文
// 通过 RunContext 传递给 Agent 的 instructions 函数和所有 tool 的 execute 函数
// ============================================================================

export type GenerateImageArgs = {
  prompt: string;
  size: '1024x1024' | '1536x1024' | '1024x1536';
};

export type GenerateImageResult = {
  b64?: string;
  url?: string;
};

export type GameAgentContext = {
  script: ScriptDefinition;
  character: CharacterRecord;
  gameRules?: GameRuleOverrides;
  memoryContext: string;
  narrationGuide: string;
  generateImage?: (args: GenerateImageArgs) => Promise<GenerateImageResult>;
};

// ============================================================================
// 构建 DM Agent 的系统指令
// 复用了原有 buildSystemPrompt 中的所有关键元素
// ============================================================================

function buildCharacterSummary(script: ScriptDefinition, character: CharacterRecord): string {
  const parts: string[] = [];
  parts.push(`角色：${character.name}（${character.occupation} / ${character.origin}）`);
  if (character.age.trim()) {
    parts.push(`年龄：${character.age}`);
  }
  const labelMap = new Map(script.skillOptions.map((skill) => [skill.id, skill.label]));
  const trainedValue = resolveTrainedSkillValue(script.rules);
  const untrainedValue = resolveUntrainedSkillValue(script.rules);
  const skillBaseValues = script.rules.skillBaseValues ?? {};
  const skillList = Object.entries(character.skills as Record<string, unknown>)
    .map(([skillId, rawValue]) => {
      const baseValue =
        typeof skillBaseValues[skillId] === 'number' && Number.isFinite(skillBaseValues[skillId])
          ? (skillBaseValues[skillId] as number)
          : untrainedValue;
      const value =
        typeof rawValue === 'number' && Number.isFinite(rawValue)
          ? rawValue
          : rawValue ? trainedValue : baseValue;
      if (value <= baseValue) {
        return null;
      }
      return labelMap.get(skillId) ?? skillId;
    })
    .filter((item): item is string => Boolean(item));
  if (skillList.length > 0) {
    parts.push(`技能：${skillList.join('、')}`);
  }
  if (character.inventory.length > 0) {
    parts.push(`装备：${character.inventory.join('、')}`);
  }
  if (character.buffs.length > 0) {
    parts.push(`Buff：${character.buffs.join('、')}`);
  }
  if (character.debuffs.length > 0) {
    parts.push(`Debuff：${character.debuffs.join('、')}`);
  }
  return parts.join('\n');
}

function buildScriptHiddenContext(script: ScriptDefinition): string {
  const parts: string[] = [];
  const background = script.background;
  if (background.overview) {
    parts.push(`背景设定：${background.overview}`);
  }
  if (background.truth) {
    parts.push(`核心真相：${background.truth}`);
  }
  if (background.themes.length > 0) {
    parts.push(`主题：${background.themes.join('、')}`);
  }
  if (background.factions.length > 0) {
    parts.push(`势力：${background.factions.join('、')}`);
  }
  if (background.locations.length > 0) {
    parts.push(`关键地点：${background.locations.join('、')}`);
  }
  if (background.explorableAreas.length > 0) {
    const areas = background.explorableAreas
      .map((area) => {
        const summary = area.summary ? `：${area.summary}` : '';
        const description = area.description ? `（${area.description}）` : '';
        const dmNotes = area.dmNotes ? `【DM 备注：${area.dmNotes}】` : '';
        return `- ${area.name}${summary}${description}${dmNotes}`;
      })
      .join('\n');
    parts.push(`可探索区域：\n${areas}`);
  }
  if (background.secrets.length > 0) {
    parts.push(`隐藏要点：${background.secrets.join('、')}`);
  }
  if (script.storyArcs.length > 0) {
    const arcs = script.storyArcs
      .map((arc, index) => {
        const beats = arc.beats.length > 0 ? `（关键点：${arc.beats.join(' / ')}）` : '';
        const reveals = arc.reveals.length > 0 ? `（揭示：${arc.reveals.join(' / ')}）` : '';
        return `${index + 1}. ${arc.title}：${arc.summary}${beats}${reveals}`;
      })
      .join('\n');
    parts.push(`故事走向：\n${arcs}`);
  }
  if (script.npcProfiles.length > 0) {
    const npcs = script.npcProfiles
      .map((npc) => {
        const attacks = npc.attacks
          .map(
            (attack) =>
              `${attack.name} ${attack.chance}% ${attack.damage}${attack.effect ? `（${attack.effect}）` : ''}`,
          )
          .join('；');
        const skills = npc.skills.map((skill) => `${skill.name}${skill.value}`).join('、');
        const traits = npc.traits.join('、');
        const roleLabel = npc.role === 'ally' ? '友方' : npc.role === 'enemy' ? '敌对' : '中立';
        return [
          `- ${npc.name}（${roleLabel} / ${npc.type} / 威胁：${npc.threat} / HP:${npc.hp}${
            npc.armor ? ` / 甲:${npc.armor}` : ''
          }${npc.move ? ` / 移动:${npc.move}` : ''}）`,
          npc.summary ? `  描述：${npc.summary}` : '',
          npc.useWhen ? `  使用时机：${npc.useWhen}` : '',
          npc.status ? `  当前状态：${npc.status}` : '',
          attacks ? `  攻击：${attacks}` : '',
          skills ? `  技能：${skills}` : '',
          traits ? `  特性：${traits}` : '',
          npc.tactics ? `  战术：${npc.tactics}` : '',
          npc.weakness ? `  弱点：${npc.weakness}` : '',
          npc.sanityLoss ? `  理智损失：${npc.sanityLoss}` : '',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');
    parts.push(`NPC 设定：\n${npcs}`);
  }
  return parts.join('\n');
}

function buildDmInstructions(context: GameAgentContext): string {
  const { script, character, memoryContext, narrationGuide } = context;
  const hiddenContext = buildScriptHiddenContext(script);
  const promptParts = [
    '你是"肉团长"，负责主持 COC 跑团。请用中文叙事并推动剧情。',
    '工具使用准则：',
    '- roll_dice：玩家行动需要判定时调用，绝不自行编造掷骰结果。',
    '- create_temp_npc：玩家与未预设 NPC 互动时（例如酒保、过路人），先生成临时人物卡再扮演。',
    '- roleplay_npc：扮演剧本中关键 NPC 前先取出档案，保证性格与战斗数据一致。',
    '- draw_map：进入新场景或玩家要求看地形时调用，生成场景地图插画。',
    '- draw_character_art：玩家大成功、达成里程碑或关键 NPC 首次登场时，作为视觉奖励调用。不要滥用，图像生成有成本。',
    '准则：遵循剧本与房规优先级；保持克苏鲁氛围；每次回复简洁有推进。',
    '不要输出行动建议列表或项目符号清单。',
    `剧本：${script.title}（${script.setting} / 难度：${script.difficulty}）`,
    `简介：${script.summary}`,
    hiddenContext ? `DM 隐藏信息（不可直接透露玩家，需通过线索逐步揭示）：\n${hiddenContext}` : '',
    buildCharacterSummary(script, character),
    memoryContext ? `历史摘要与世界状态：\n${memoryContext}` : '历史摘要与世界状态：无',
    '请按以下格式输出：',
    '【叙事】',
    '...剧情描述...',
    '【绘图】',
    '使用 ASCII/emoji 简要呈现位置关系与周边环境，控制在 40 列以内；若无需更新则写"无"。',
    '不要输出多余的解释或前后缀。',
  ];
  if (narrationGuide.trim()) {
    promptParts.splice(4, 0, narrationGuide.trim());
  }
  return promptParts.join('\n');
}

// ============================================================================
// DM Agent 定义
// instructions 是一个函数，每次 run 时根据 GameAgentContext 动态生成
// ============================================================================

export const dmAgent = new Agent<GameAgentContext>({
  name: '肉团长',
  model: 'gpt-5-mini',
  instructions: (ctx) => buildDmInstructions(ctx.context),
  tools: dmTools,
  modelSettings: {
    maxTokens: 800,
  },
});
