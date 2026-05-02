import type {
  CocSceneRiskLevel,
  RulebookEntity,
  RulebookEntityRef,
  RulebookEntityType,
  RulesetDefinition,
  ScriptDefinition,
} from './types.ts';
import { DEFAULT_RULESET_ID } from './types.ts';

export const COC_LITE_RULESET_ID = DEFAULT_RULESET_ID;

export const COC_LITE_RULESET: RulesetDefinition = {
  id: COC_LITE_RULESET_ID,
  name: 'COC 7e Lite',
  system: 'Call of Cthulhu 7e',
  summary: '项目内置的 COC 新手向最小规则包，用于模组制作、基础裁定和场景风险评估。',
  source: 'project:coc-7e-lite',
};

const COC_LITE_SOURCE = 'project:coc-7e-lite';

const COC_LITE_ENTITIES: RulebookEntity[] = [
  {
    id: 'rule-check-difficulty',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'rule',
    name: '检定难度',
    summary: '普通检定使用完整技能/属性值，困难检定使用一半，极难检定使用五分之一。',
    tags: ['检定', '难度', '基础规则'],
    source: COC_LITE_SOURCE,
    data: {
      normal: '技能或属性原值',
      hard: '技能或属性的一半，向下取整',
      extreme: '技能或属性的五分之一，向下取整',
    },
  },
  {
    id: 'rule-pushed-roll',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'rule',
    name: '孤注一掷',
    summary: '失败后可在付出明确风险的前提下重试一次；再次失败应带来更严重后果。',
    tags: ['检定', '失败推进', '新手友好'],
    source: COC_LITE_SOURCE,
    data: {
      useWhen: '玩家提出新的方法、投入额外资源或承担明确风险时',
      failForward: true,
    },
  },
  {
    id: 'rule-sanity-pressure',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'rule',
    name: '理智压力',
    summary: '恐怖揭示、超自然现象和神话接触会造成理智损失；新手模组应避免连续高强度理智冲击。',
    tags: ['理智', '恐怖', '风险'],
    source: COC_LITE_SOURCE,
    data: {
      low: '0/1',
      moderate: '0/1D3 或 1/1D4',
      high: '1/1D6 或更高',
    },
  },
  {
    id: 'skill-spot-hidden',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '侦查',
    summary: '发现环境中的细节、异常痕迹、隐藏物件和微弱线索。',
    tags: ['技能', '调查', '线索'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 25, group: '调查', suggestedUse: '查看房间、尸体、痕迹、机关' },
  },
  {
    id: 'skill-listen',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '聆听',
    summary: '辨识声音来源、距离、异常动静或偷听对话。',
    tags: ['技能', '调查', '感知'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 20, group: '调查', suggestedUse: '隔墙声音、脚步声、低语' },
  },
  {
    id: 'skill-library-use',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '图书馆使用',
    summary: '从档案、报纸、书籍和数据库中找到相关信息。',
    tags: ['技能', '调查', '资料'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 20, group: '调查', suggestedUse: '查档、查旧报纸、找传说记录' },
  },
  {
    id: 'skill-occult',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '神秘学',
    summary: '识别民俗、仪式、符号、传说和伪神秘学知识。',
    tags: ['技能', '学识', '仪式'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 5, group: '学识', suggestedUse: '辨认符号、仪式、传说来源' },
  },
  {
    id: 'skill-psychology',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '心理学',
    summary: '判断人物情绪、谎言、压力和异常反应。',
    tags: ['技能', '社交', '洞察'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 10, group: '社交', suggestedUse: '判断 NPC 是否隐瞒或恐惧' },
  },
  {
    id: 'skill-persuade',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '说服',
    summary: '通过理性沟通让 NPC 接受请求、提供信息或改变立场。',
    tags: ['技能', '社交'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 10, group: '社交', suggestedUse: '请求协助、争取时间、获取许可' },
  },
  {
    id: 'skill-stealth',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '潜行',
    summary: '避免被发现、悄悄接近或离开危险区域。',
    tags: ['技能', '行动'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 20, group: '行动', suggestedUse: '潜入、跟踪、避开巡逻' },
  },
  {
    id: 'skill-locksmith',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '开锁',
    summary: '打开机械锁、门锁、箱锁或处理简单机关。',
    tags: ['技能', '行动', '障碍'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 1, group: '行动', suggestedUse: '开门、开箱、绕过锁具' },
  },
  {
    id: 'skill-brawl',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '格斗',
    summary: '徒手或近身武器攻击、挣脱、推搡和制服。',
    tags: ['技能', '战斗'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 25, group: '战斗', suggestedUse: '近身冲突、夺取物品、制服 NPC' },
  },
  {
    id: 'skill-firearms-handgun',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'skill',
    name: '枪械：手枪',
    summary: '使用手枪、左轮等短枪械进行攻击。',
    tags: ['技能', '战斗', '枪械'],
    source: COC_LITE_SOURCE,
    data: { defaultValue: 20, group: '战斗', suggestedUse: '手枪射击、威慑' },
  },
  {
    id: 'occupation-investigator',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'occupation_template',
    name: '调查员模板',
    summary: '适合新手的通用调查员，擅长发现线索、访问目击者和整理资料。',
    tags: ['职业', '新手', '调查'],
    source: COC_LITE_SOURCE,
    data: {
      suggestedSkills: ['侦查', '聆听', '图书馆使用', '心理学', '说服'],
      suggestedEquipment: ['手电筒', '笔记本', '相机', '录音设备'],
    },
  },
  {
    id: 'occupation-occultist',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'occupation_template',
    name: '民俗研究者模板',
    summary: '熟悉民间传说和仪式痕迹，适合参与超自然调查。',
    tags: ['职业', '神秘学', '调查'],
    source: COC_LITE_SOURCE,
    data: {
      suggestedSkills: ['神秘学', '图书馆使用', '侦查', '心理学', '聆听'],
      suggestedEquipment: ['旧笔记', '护符', '蜡烛', '录音设备'],
    },
  },
  {
    id: 'npc-frightened-witness',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'npc_template',
    name: '受惊目击者',
    summary: '见过异常事件但不愿完整说出的普通人，适合提供片段线索。',
    tags: ['NPC', '线索', '社交'],
    source: COC_LITE_SOURCE,
    data: {
      role: 'neutral',
      combatRisk: 'low',
      clueUse: '通过安抚、说服或心理学获得不完整线索',
      suggestedSkills: { psychology: 20, persuadeResistance: 40 },
    },
  },
  {
    id: 'npc-cultist-basic',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'npc_template',
    name: '低阶邪教徒',
    summary: '意志狂热但能力普通的敌对人类，适合作为新手模组的低强度阻碍。',
    tags: ['NPC', '敌人', '战斗', '邪教'],
    source: COC_LITE_SOURCE,
    data: {
      role: 'enemy',
      combatRisk: 'moderate',
      hp: 10,
      attacks: ['匕首 1D4+1', '拳脚 1D3'],
      skills: { brawl: 40, stealth: 30, intimidation: 35 },
      sanityLoss: '0/1',
    },
  },
  {
    id: 'creature-minor-spirit',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'creature',
    name: '低阶怨灵',
    summary: '由强烈情绪残留形成的弱小灵体现象，适合新手模组的超自然威胁。',
    tags: ['怪物', '灵体', '理智', '新手'],
    source: COC_LITE_SOURCE,
    data: {
      combatRisk: 'moderate',
      hp: 8,
      armor: 0,
      attacks: ['寒意侵袭 1D3', '恐惧低语'],
      traits: ['畏惧强光或仪式物件'],
      sanityLoss: '0/1D3',
      weakness: '强光、盐圈、合适的驱散仪式',
    },
  },
  {
    id: 'hazard-locked-door',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'hazard',
    name: '上锁的门',
    summary: '最常见的探索障碍，应提供开锁、破坏、找钥匙等多条路径。',
    tags: ['障碍', '线索门槛', '新手友好'],
    source: COC_LITE_SOURCE,
    data: {
      suggestedChecks: ['开锁', '力量', '侦查'],
      failForward: '失败也应给出噪音、耗时、工具损坏或替代路线，而不是直接卡死。',
    },
  },
  {
    id: 'guideline-beginner-scene-risk',
    rulesetId: COC_LITE_RULESET_ID,
    type: 'scene_risk_guideline',
    name: '新手场景风险原则',
    summary: '新手 COC 模组应避免同一场景同时出现高战斗、高理智和唯一线索门槛。',
    tags: ['风险评估', '新手', '模组制作'],
    source: COC_LITE_SOURCE,
    data: {
      combat: '单个中等威胁通常可接受，多个中等威胁需要替代路线。',
      sanity: '连续 1D6 级理智损失会显著提高压力。',
      clues: '关键线索不要只依赖一次检定成功。',
    },
  },
];

const RISK_RANK: Record<CocSceneRiskLevel, number> = {
  low: 0,
  moderate: 1,
  high: 2,
  deadly: 3,
};

const RISK_BY_RANK: CocSceneRiskLevel[] = ['low', 'moderate', 'high', 'deadly'];

const COMBAT_WEIGHT: Record<CocSceneRiskLevel, number> = {
  low: 1,
  moderate: 2,
  high: 4,
  deadly: 6,
};

export type RulebookSearchInput = {
  rulesetId?: string;
  query?: string;
  type?: RulebookEntityType;
  tags?: string[];
  limit?: number;
};

export type EstimateCocSceneRiskInput = {
  rulesetId?: string;
  party?: {
    investigatorCount?: number;
    experience?: 'new' | 'standard' | 'veteran';
  };
  entityRefs?: Array<Pick<RulebookEntityRef, 'entityId' | 'count'> & { rulesetId?: string }>;
  cluePlan?: {
    essentialClues?: number;
    gatedClues?: number;
    alternatePaths?: number;
  };
  sanityLosses?: string[];
  environmentHazards?: string[];
};

export type CocSceneRiskEstimate = {
  rulesetId: string;
  combatRisk: CocSceneRiskLevel;
  sanityRisk: CocSceneRiskLevel;
  clueRisk: CocSceneRiskLevel;
  overallRisk: CocSceneRiskLevel;
  referencedEntities: Array<{
    entityId: string;
    name: string;
    type: RulebookEntityType;
    count: number;
  }>;
  warnings: string[];
  suggestions: string[];
};

export type CocModulePlayabilityReport = {
  isPlayable: boolean;
  warnings: string[];
  suggestions: string[];
};

export function listRulesets(): RulesetDefinition[] {
  return [COC_LITE_RULESET];
}

export function listRulebookEntities(rulesetId = COC_LITE_RULESET_ID): RulebookEntity[] {
  return COC_LITE_ENTITIES.filter((entity) => entity.rulesetId === rulesetId);
}

export function getRulebookEntity(entityId: string, rulesetId = COC_LITE_RULESET_ID): RulebookEntity | null {
  const trimmedId = entityId.trim();
  if (!trimmedId) {
    return null;
  }
  return listRulebookEntities(rulesetId).find((entity) => entity.id === trimmedId) ?? null;
}

export function resolveRulebookRef(ref: RulebookEntityRef): RulebookEntity | null {
  return getRulebookEntity(ref.entityId, ref.rulesetId);
}

export function searchRulebook(input: RulebookSearchInput): RulebookEntity[] {
  const rulesetId = input.rulesetId?.trim() || COC_LITE_RULESET_ID;
  const terms = normalizeSearchTerms(input.query);
  const requiredTags = (input.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const limit =
    typeof input.limit === 'number' && Number.isFinite(input.limit) ? Math.max(0, Math.floor(input.limit)) : 20;
  const matched = listRulebookEntities(rulesetId).filter((entity) => {
    if (input.type && entity.type !== input.type) {
      return false;
    }
    if (requiredTags.length > 0 && !requiredTags.every((tag) => entity.tags.includes(tag))) {
      return false;
    }
    if (terms.length === 0) {
      return true;
    }
    const haystack = [entity.id, entity.name, entity.summary, ...entity.tags].join(' ').toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
  return limit > 0 ? matched.slice(0, limit) : matched;
}

export function estimateCocSceneRisk(input: EstimateCocSceneRiskInput): CocSceneRiskEstimate {
  const rulesetId = input.rulesetId?.trim() || COC_LITE_RULESET_ID;
  const entityRefs = input.entityRefs ?? [];
  const referencedEntities: CocSceneRiskEstimate['referencedEntities'] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const entitySanityLosses: string[] = [];
  let combatScore = 0;

  for (const ref of entityRefs) {
    const entity = getRulebookEntity(ref.entityId, ref.rulesetId?.trim() || rulesetId);
    const count = normalizeCount(ref.count);
    if (!entity) {
      warnings.push(`未找到规则书实体：${ref.entityId}`);
      continue;
    }
    referencedEntities.push({ entityId: entity.id, name: entity.name, type: entity.type, count });
    const combatRisk = normalizeRiskLevel(entity.data.combatRisk);
    combatScore += COMBAT_WEIGHT[combatRisk] * count;
    const sanityLoss = typeof entity.data.sanityLoss === 'string' ? entity.data.sanityLoss : '';
    if (sanityLoss) {
      entitySanityLosses.push(sanityLoss);
    }
  }

  const combatRisk = estimateCombatRisk(combatScore, input.party);
  const sanityRisk = estimateSanityRisk([...(input.sanityLosses ?? []), ...entitySanityLosses]);
  const clueRisk = estimateClueRisk(input.cluePlan);
  const overallRisk = maxRisk([combatRisk, sanityRisk, clueRisk]);

  if (combatRisk === 'high' || combatRisk === 'deadly') {
    warnings.push('战斗风险偏高，COC 新手模组不应默认要求正面击败敌人。');
    suggestions.push('提供逃跑、谈判、仪式、环境利用或绕行路线。');
  }
  if (sanityRisk === 'high' || sanityRisk === 'deadly') {
    warnings.push('理智压力偏高，连续高强度恐怖揭示可能压垮新手玩家。');
    suggestions.push('拆分恐怖揭示，并在关键理智冲击前提供预兆。');
  }
  if (clueRisk === 'high' || clueRisk === 'deadly') {
    warnings.push('关键线索门槛偏高，存在检定失败后卡关风险。');
    suggestions.push('关键线索至少准备一个免检定线索或替代获取路径。');
  }
  if ((input.environmentHazards ?? []).length > 0 && overallRisk !== 'low') {
    warnings.push('环境危险会放大当前场景风险。');
  }

  return {
    rulesetId,
    combatRisk,
    sanityRisk,
    clueRisk,
    overallRisk,
    referencedEntities,
    warnings,
    suggestions: Array.from(new Set(suggestions)),
  };
}

export function validateCocModulePlayability(script: ScriptDefinition): CocModulePlayabilityReport {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (script.rulesetId !== COC_LITE_RULESET_ID) {
    warnings.push(`当前只验证 ${COC_LITE_RULESET_ID}，模组使用的是 ${script.rulesetId}。`);
  }
  if (!script.background.truth.trim()) {
    warnings.push('缺少 DM 隐藏的核心真相。');
    suggestions.push('补充幕后原因、真实威胁和最终揭示方式。');
  }
  if (script.scenes.length === 0) {
    warnings.push('缺少可运行场景。');
    suggestions.push('至少准备开场、调查、高潮三个场景。');
  }
  if (script.background.explorableAreas.length === 0) {
    warnings.push('缺少可探索区域。');
    suggestions.push('给玩家准备 2-4 个可主动探索地点。');
  }
  if (script.storyArcs.length === 0 && script.encounters.length === 0) {
    warnings.push('缺少故事推进或遭遇节点。');
    suggestions.push('补充至少一条故事弧或一个关键遭遇。');
  }
  if (script.openingMessages.length === 0) {
    warnings.push('缺少开场信息。');
    suggestions.push('补充玩家进入游戏时能立即行动的开场描述。');
  }

  return {
    isPlayable: warnings.length === 0,
    warnings,
    suggestions: Array.from(new Set(suggestions)),
  };
}

function normalizeSearchTerms(query: string | undefined): string[] {
  if (!query) {
    return [];
  }
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
}

function normalizeCount(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(value));
}

function normalizeRiskLevel(value: unknown): CocSceneRiskLevel {
  if (value === 'moderate' || value === 'high' || value === 'deadly') {
    return value;
  }
  return 'low';
}

function riskFromRank(rank: number): CocSceneRiskLevel {
  const clamped = Math.min(Math.max(Math.floor(rank), 0), RISK_BY_RANK.length - 1);
  return RISK_BY_RANK[clamped];
}

function maxRisk(risks: CocSceneRiskLevel[]): CocSceneRiskLevel {
  return riskFromRank(Math.max(...risks.map((risk) => RISK_RANK[risk])));
}

function estimateCombatRisk(
  combatScore: number,
  party: EstimateCocSceneRiskInput['party'] | undefined,
): CocSceneRiskLevel {
  if (combatScore <= 0) {
    return 'low';
  }
  const investigatorCount = normalizeCount(party?.investigatorCount ?? 4);
  const pressure = combatScore / investigatorCount;
  let rank = 0;
  if (pressure > 1.5) {
    rank = 3;
  } else if (pressure > 1) {
    rank = 2;
  } else if (pressure > 0.5) {
    rank = 1;
  }
  if (party?.experience === 'new' && rank > 0) {
    rank += 1;
  }
  if (party?.experience === 'veteran' && rank > 0) {
    rank -= 1;
  }
  return riskFromRank(rank);
}

function estimateSanityRisk(losses: string[]): CocSceneRiskLevel {
  const maxLoss = losses.reduce((sum, loss) => sum + estimateMaxSanityLoss(loss), 0);
  if (maxLoss <= 1) {
    return 'low';
  }
  if (maxLoss <= 4) {
    return 'moderate';
  }
  if (maxLoss <= 8) {
    return 'high';
  }
  return 'deadly';
}

function estimateClueRisk(cluePlan: EstimateCocSceneRiskInput['cluePlan'] | undefined): CocSceneRiskLevel {
  if (!cluePlan) {
    return 'low';
  }
  const essentialClues = Math.max(0, Math.floor(cluePlan.essentialClues ?? 0));
  const gatedClues = Math.max(0, Math.floor(cluePlan.gatedClues ?? 0));
  const alternatePaths = Math.max(0, Math.floor(cluePlan.alternatePaths ?? 0));
  if (essentialClues === 0 || gatedClues === 0) {
    return 'low';
  }
  if (alternatePaths >= gatedClues) {
    return 'moderate';
  }
  if (alternatePaths > 0) {
    return 'high';
  }
  return gatedClues >= essentialClues ? 'deadly' : 'high';
}

function estimateMaxSanityLoss(lossText: string): number {
  const severePart = lossText.includes('/') ? lossText.split('/').pop() : lossText;
  const text = severePart?.trim().toUpperCase() ?? '';
  if (!text) {
    return 0;
  }
  const diceMatches = Array.from(text.matchAll(/(\d*)D(\d+)/g));
  let total = 0;
  for (const match of diceMatches) {
    const count = match[1] ? Number(match[1]) : 1;
    const sides = Number(match[2]);
    if (Number.isFinite(count) && Number.isFinite(sides)) {
      total += count * sides;
    }
  }
  const withoutDice = text.replace(/\d*D\d+/g, ' ');
  for (const match of withoutDice.matchAll(/\d+/g)) {
    total += Number(match[0]);
  }
  return total;
}
