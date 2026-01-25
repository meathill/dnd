import type { AttributeKey, AttributeRangeMap, CharacterFieldErrors } from '../lib/game/types';
import { DEFAULT_ATTRIBUTE_RANGES, resolveAttributePointBudget } from '../lib/game/rules';

export type StepItem = {
  title: string;
  description: string;
};

export const steps: StepItem[] = [
  { title: '身份信息', description: '角色姓名、职业与来源' },
  { title: '基础属性', description: '八项主属性与派生' },
  { title: '技能与装备', description: '擅长领域与随身物品' },
  { title: '状态与背景', description: 'Buff、Debuff 与设定' },
  { title: '确认创建', description: '预览角色卡摘要' },
];

export type AttributeOption = {
  id: AttributeKey;
  label: string;
  min: number;
  max: number;
  recommendedMin: number;
  group: string;
};

export const attributeDescriptions: Record<AttributeKey, string> = {
  strength: '决定肉体力量与负重，影响近战伤害与强行行动。',
  dexterity: '反应与协调性，影响先攻与精细动作。',
  constitution: '耐力与健康，影响生命值与抗病。',
  size: '体格与身形，影响生命值与对抗强度。',
  intelligence: '理解与推理能力，影响灵感与线索整合。',
  willpower: '意志与精神强度，影响理智与魔法值。',
  appearance: '外表与气质，影响初始印象与社交。',
  education: '知识与训练，影响专业技能上限。',
};

export const baseAttributeOptions: AttributeOption[] = [
  {
    id: 'strength',
    label: '力量',
    min: DEFAULT_ATTRIBUTE_RANGES.strength?.min ?? 20,
    max: DEFAULT_ATTRIBUTE_RANGES.strength?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.strength?.min ?? 20,
    group: '身体',
  },
  {
    id: 'dexterity',
    label: '敏捷',
    min: DEFAULT_ATTRIBUTE_RANGES.dexterity?.min ?? 20,
    max: DEFAULT_ATTRIBUTE_RANGES.dexterity?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.dexterity?.min ?? 20,
    group: '身体',
  },
  {
    id: 'constitution',
    label: '体质',
    min: DEFAULT_ATTRIBUTE_RANGES.constitution?.min ?? 20,
    max: DEFAULT_ATTRIBUTE_RANGES.constitution?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.constitution?.min ?? 20,
    group: '身体',
  },
  {
    id: 'size',
    label: '体型',
    min: DEFAULT_ATTRIBUTE_RANGES.size?.min ?? 20,
    max: DEFAULT_ATTRIBUTE_RANGES.size?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.size?.min ?? 20,
    group: '身体',
  },
  {
    id: 'intelligence',
    label: '智力',
    min: DEFAULT_ATTRIBUTE_RANGES.intelligence?.min ?? 40,
    max: DEFAULT_ATTRIBUTE_RANGES.intelligence?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.intelligence?.min ?? 40,
    group: '心智',
  },
  {
    id: 'willpower',
    label: '意志',
    min: DEFAULT_ATTRIBUTE_RANGES.willpower?.min ?? 30,
    max: DEFAULT_ATTRIBUTE_RANGES.willpower?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.willpower?.min ?? 30,
    group: '心智',
  },
  {
    id: 'appearance',
    label: '外貌',
    min: DEFAULT_ATTRIBUTE_RANGES.appearance?.min ?? 15,
    max: DEFAULT_ATTRIBUTE_RANGES.appearance?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.appearance?.min ?? 15,
    group: '心智',
  },
  {
    id: 'education',
    label: '教育',
    min: DEFAULT_ATTRIBUTE_RANGES.education?.min ?? 40,
    max: DEFAULT_ATTRIBUTE_RANGES.education?.max ?? 90,
    recommendedMin: DEFAULT_ATTRIBUTE_RANGES.education?.min ?? 40,
    group: '心智',
  },
];

export type SkillOption = {
  id: string;
  label: string;
  group: string;
};

export const defaultSkillOptions: SkillOption[] = [
  { id: 'spotHidden', label: '侦查', group: '调查' },
  { id: 'libraryUse', label: '图书馆', group: '调查' },
  { id: 'listen', label: '聆听', group: '调查' },
  { id: 'psychology', label: '心理学', group: '调查' },
  { id: 'persuade', label: '说服', group: '社交' },
  { id: 'charm', label: '魅惑', group: '社交' },
  { id: 'stealth', label: '潜行', group: '行动' },
  { id: 'locksmith', label: '开锁', group: '行动' },
  { id: 'firearms', label: '枪械', group: '战斗' },
  { id: 'brawl', label: '格斗', group: '战斗' },
  { id: 'medicine', label: '医学', group: '学识' },
  { id: 'occult', label: '神秘学', group: '学识' },
] as const;

export type SkillId = string;

export const defaultBuffOptions = ['灵感加持', '冷静分析', '行动迅捷', '夜视适应', '战斗节奏'] as const;
export const defaultDebuffOptions = ['轻微受伤', '噩梦缠身', '恐惧残留', '精神负荷', '疑虑加重'] as const;

export const defaultBuffDescriptions: Record<BuffId, string> = {
  灵感加持: '关键线索更容易浮现，推理类判定获得优势。',
  冷静分析: '在压力下保持判断力，恐惧类判定更稳。',
  行动迅捷: '先攻与追逐时占优，移动更灵活。',
  夜视适应: '昏暗环境视野更好，观察惩罚降低。',
  战斗节奏: '进入战斗更快，格斗与射击更稳定。',
};

export const defaultDebuffDescriptions: Record<DebuffId, string> = {
  轻微受伤: '负伤影响动作，体能类判定略受罚。',
  噩梦缠身: '休息不足，理智与注意力波动。',
  恐惧残留: '对特定刺激更敏感，恐惧判定更难。',
  精神负荷: '长期紧绷，思考与施法更易失误。',
  疑虑加重: '内心摇摆，社交与说服判定受影响。',
};

export type BuffId = string;
export type DebuffId = string;

export type FormState = {
  name: string;
  occupation: string;
  age: string;
  origin: string;
  appearance: string;
  background: string;
  motivation: string;
  attributes: Record<AttributeKey, number>;
  skills: Record<SkillId, boolean>;
  inventory: string;
  buffs: BuffId[];
  debuffs: DebuffId[];
  note: string;
};

export type UpdateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;

export type UpdateAttribute = (attributeKey: AttributeKey, value: number) => void;

export type ToggleSkill = (skillId: SkillId) => void;

export type ToggleBuff = (buff: BuffId) => void;

export type ToggleDebuff = (debuff: DebuffId) => void;

export const fieldLabelClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export function buildAttributeOptions(attributeRanges: AttributeRangeMap = {}): AttributeOption[] {
  return baseAttributeOptions.map((attribute) => {
    const range = attributeRanges[attribute.id];
    if (!range) {
      return attribute;
    }
    return {
      ...attribute,
      min: range.min,
      max: range.max,
    };
  });
}

export function calculateAttributeTotal(attributes: Record<AttributeKey, number>): number {
  return Object.values(attributes).reduce((sum, value) => sum + value, 0);
}

export function getAttributeTooltip(attributeId: AttributeKey): string {
  return attributeDescriptions[attributeId] ?? '属性说明待补充。';
}

export function getBuffTooltip(buff: BuffId): string {
  return defaultBuffDescriptions[buff] ?? `增益状态：${buff}`;
}

export function getDebuffTooltip(debuff: DebuffId): string {
  return defaultDebuffDescriptions[debuff] ?? `减益状态：${debuff}`;
}

function buildAverageAttributes(attributeOptions: AttributeOption[]): Record<AttributeKey, number> {
  const result = {} as Record<AttributeKey, number>;
  attributeOptions.forEach((attribute) => {
    result[attribute.id] = Math.round((attribute.min + attribute.max) / 2);
  });
  return result;
}

function buildMinimumAttributes(attributeOptions: AttributeOption[]): Record<AttributeKey, number> {
  const result = {} as Record<AttributeKey, number>;
  attributeOptions.forEach((attribute) => {
    result[attribute.id] = attribute.min;
  });
  return result;
}

export function buildDefaultAttributes(
  attributeOptions: AttributeOption[] = baseAttributeOptions,
  attributePointBudget = 0,
): Record<AttributeKey, number> {
  const averageAttributes = buildAverageAttributes(attributeOptions);
  if (attributePointBudget <= 0) {
    return averageAttributes;
  }
  const averageTotal = calculateAttributeTotal(averageAttributes);
  if (averageTotal <= attributePointBudget) {
    return averageAttributes;
  }
  const minimumAttributes = buildMinimumAttributes(attributeOptions);
  const minimumTotal = calculateAttributeTotal(minimumAttributes);
  if (minimumTotal >= attributePointBudget) {
    return minimumAttributes;
  }
  const adjustedAttributes = { ...averageAttributes };
  let excess = averageTotal - attributePointBudget;
  for (const attribute of attributeOptions) {
    if (excess <= 0) {
      break;
    }
    const currentValue = adjustedAttributes[attribute.id];
    const reducible = currentValue - attribute.min;
    if (reducible <= 0) {
      continue;
    }
    const reduction = Math.min(reducible, excess);
    adjustedAttributes[attribute.id] = currentValue - reduction;
    excess -= reduction;
  }
  return adjustedAttributes;
}

export type { AttributeKey, AttributeRangeMap };

export type SubmitResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: CharacterFieldErrors;
      message?: string;
    };

export function buildDefaultSkills(
  skillOptions: SkillOption[] = defaultSkillOptions,
  defaultSelectedCount = 4,
): Record<SkillId, boolean> {
  const result: Record<SkillId, boolean> = {};
  skillOptions.forEach((skill, index) => {
    result[skill.id] = index < defaultSelectedCount;
  });
  return result;
}

type FormStateSeed = {
  attributeOptions?: AttributeOption[];
  attributePointBudget?: number;
  skillOptions?: SkillOption[];
  skillLimit?: number;
  occupationOptions?: string[];
  originOptions?: string[];
  inventory?: string;
  buffOptions?: string[];
  debuffOptions?: string[];
};

export function buildDefaultFormState(seed: FormStateSeed = {}): FormState {
  const effectiveAttributePointBudget = resolveAttributePointBudget(seed.attributePointBudget);
  return {
    name: '沈砚',
    occupation: seed.occupationOptions?.[0] ?? '调查记者',
    age: '31',
    origin: seed.originOptions?.[0] ?? '静默港口',
    appearance: '瘦高、黑色风衣、常带速记本',
    background: '曾追踪港口失踪案，留下未解的档案。',
    motivation: '找出旅店里隐藏的真相，保护同伴。',
    attributes: buildDefaultAttributes(seed.attributeOptions, effectiveAttributePointBudget),
    skills: buildDefaultSkills(seed.skillOptions, seed.skillLimit && seed.skillLimit > 0 ? seed.skillLimit : 4),
    inventory: seed.inventory ?? '黑色风衣、左轮手枪、速记本、银质怀表',
    buffs: seed.buffOptions?.slice(0, 1) ?? ['灵感加持'],
    debuffs: seed.debuffOptions?.slice(0, 1) ?? ['噩梦缠身'],
    note: '习惯在行动前整理线索，并标记可疑人物。',
  };
}
