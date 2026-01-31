import type { DmProfile } from './types';

export const DEFAULT_DM_PROFILE_ID = 'dm-default';

export const DEFAULT_ANALYSIS_GUIDE = [
  '目标：让玩家玩得开心，保持开放但不过度越权，遵循规则优先级（房规 > 规则书 > 情境裁定）。',
  '判定总则：',
  '1) 以“允许并推进”为默认；除非明显越权/越狱/跨时代/与剧本核心冲突，否则 allowed=true。',
  '2) 玩家描述的结果只代表意图，必须拆分为可执行动作 + 检定。',
  '3) 不要因为“角色能力不足”直接拒绝，改用更高难度或附带代价。',
  '4) 不确定时选择普通或困难，不要频繁给极难。',
  '5) 需要前置条件时先补前置或分步行动。',
  '6) 禁止自行掷骰或计算成功/失败，只给出参数交由函数处理。',
  '记忆与一致性：',
  '7) 新增事实需保持一致，并在叙事中明确以便进入记录。',
].join('\n');

export const DEFAULT_NARRATION_GUIDE = [
  '叙事风格：',
  '1) 每轮给出“发生了什么 + 环境变化 + 可行动线索”，节奏紧凑。',
  '2) 失败也要推进：给线索、代价或替代路径，避免卡关。',
  '3) 对越权/越狱用世界内反馈化解，不与玩家争论系统规则。',
  '4) 新生成内容要具体可互动，方便后续引用。',
  '5) 维持克苏鲁压迫感，但避免无预警的团灭。',
].join('\n');

export function buildFallbackDmProfile(): DmProfile {
  return {
    id: DEFAULT_DM_PROFILE_ID,
    name: '温和推进',
    summary: '偏向剧情推进，减少卡关与硬失败。',
    analysisGuide: DEFAULT_ANALYSIS_GUIDE,
    narrationGuide: DEFAULT_NARRATION_GUIDE,
    isDefault: true,
    createdAt: '',
    updatedAt: '',
  };
}
