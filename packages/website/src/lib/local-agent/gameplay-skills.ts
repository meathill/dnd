import { z } from 'zod';
import {
  DEFAULT_CHECK_DC,
  checkAttribute,
  checkLuck,
  checkSanity,
  checkSkill,
  resolveCheckDc,
  resolveUntrainedSkillValue,
} from '../game/rules.ts';
import type { AttributeKey, ScriptDefinition } from '../game/types.ts';
import {
  enumSchema,
  GENERIC_OBJECT_SCHEMA,
  integerSchema,
  nullableSchema,
  objectSchema,
  stringSchema,
} from './skill-contract.ts';
import {
  buildCheckKey,
  createSkill,
  localArtifactSourceSchema,
  requireCharacter,
  requireScript,
  resolveAttributeValue,
  resolveSkillId,
  resolveSkillValue,
  rollAttribute2d6p6,
  rollAttribute3d6,
} from './skill-helpers.ts';

const checkTypeSchema = z.enum(['skill', 'attribute', 'luck', 'sanity', 'combat']);
const difficultySchema = z.enum(['normal', 'hard', 'extreme']);

const rollDiceInputSchema = z.object({
  checkType: checkTypeSchema,
  target: z.string().min(1),
  difficulty: difficultySchema.default('normal'),
  reason: z.string().optional(),
  dc: z.number().int().min(1).max(100).optional(),
});

const createTempNpcInputSchema = z.object({
  name: z.string().min(1),
  occupation: z.string().min(1),
  role: z.enum(['ally', 'neutral', 'enemy']).default('neutral'),
  personality: z.string().min(1),
  appearance: z.string().optional(),
  source: localArtifactSourceSchema.optional(),
});

const roleplayNpcInputSchema = z.object({
  nameOrId: z.string().min(1),
});

type RollDiceInput = z.infer<typeof rollDiceInputSchema>;
type CreateTempNpcInput = z.infer<typeof createTempNpcInputSchema>;
type RoleplayNpcInput = z.infer<typeof roleplayNpcInputSchema>;

export const rollDiceSkill = createSkill<
  RollDiceInput,
  {
    checkType: z.infer<typeof checkTypeSchema>;
    target: string;
    difficulty: z.infer<typeof difficultySchema>;
    roll: number;
    threshold: number;
    outcome: string;
    baseValue: number;
    dc: number;
    text: string;
  }
>({
  name: 'roll_dice',
  version: 1,
  title: '执行检定',
  description: '执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。',
  group: 'gameplay',
  executionMode: 'native',
  whenToUse: ['技能检定。', '属性检定。', '幸运检定。', '理智检定。', '战斗技能判定。'],
  forbidden: ['不调用 skill 就直接宣布成功或失败。', '把纯叙事动作滥用成检定。'],
  inputSchema: objectSchema(
    {
      checkType: enumSchema(['skill', 'attribute', 'luck', 'sanity', 'combat'], '检定类型。'),
      target: stringSchema('技能名、技能 id 或属性名。'),
      difficulty: enumSchema(['normal', 'hard', 'extreme'], '检定难度。', { default: 'normal' }),
      reason: stringSchema('检定原因，可留空。'),
      dc: integerSchema('额外 DC 覆盖，可留空。', { minimum: 1, maximum: 100 }),
    },
    ['checkType', 'target'],
    '检定参数。',
  ),
  outputSchema: objectSchema(
    {
      checkType: enumSchema(['skill', 'attribute', 'luck', 'sanity', 'combat'], '检定类型。'),
      target: stringSchema('检定目标。'),
      difficulty: enumSchema(['normal', 'hard', 'extreme'], '检定难度。'),
      roll: integerSchema('D100 掷骰结果。', { minimum: 1, maximum: 100 }),
      threshold: integerSchema('最终阈值。', { minimum: 1, maximum: 100 }),
      outcome: stringSchema('成败结果。'),
      baseValue: integerSchema('基础值。', { minimum: 0, maximum: 100 }),
      dc: integerSchema('最终 DC。', { minimum: 1, maximum: 100 }),
      text: stringSchema('面向 UI 的简要文本。'),
    },
    ['checkType', 'target', 'difficulty', 'roll', 'threshold', 'outcome', 'baseValue', 'dc', 'text'],
    '检定结果。',
  ),
  parseInput: (input) => rollDiceInputSchema.parse(input),
  execute: (input, context) => {
    const script = requireScript(context);
    const character = requireCharacter(context);
    const checkKey = buildCheckKey(input.checkType, input.target, script);
    const { dc } = resolveCheckDc({ targetKey: checkKey, aiDc: input.dc, scriptRules: script.rules });

    let result;
    let label: string;
    let baseLabel: string;
    let baseValue: number;

    if (input.checkType === 'luck') {
      baseValue = character.luck ?? 0;
      result = checkLuck(dc, baseValue, input.difficulty, context.randomFn);
      label = '幸运';
      baseLabel = '幸运值';
    } else if (input.checkType === 'sanity') {
      baseValue = Math.max(0, Math.floor(character.attributes.willpower ?? 0));
      result = checkSanity(dc, baseValue, input.difficulty, context.randomFn);
      label = '理智';
      baseLabel = '理智值';
    } else if (input.checkType === 'attribute') {
      label = input.target.trim() || '属性';
      baseValue = resolveAttributeValue(character, input.target) ?? 0;
      result = checkAttribute(dc, baseValue, input.difficulty, context.randomFn);
      baseLabel = '属性值';
    } else {
      const skillId = resolveSkillId(script, input.target) ?? input.target.trim();
      const skillLabel = script.skillOptions.find((opt) => opt.id === skillId)?.label ?? input.target.trim();
      label = skillLabel || '技能';
      baseValue = skillId ? resolveSkillValue(character, script, skillId) : resolveUntrainedSkillValue(script.rules);
      result = checkSkill(dc, baseValue, input.difficulty, context.randomFn);
      baseLabel = '技能值';
    }

    const reasonText = input.reason ? `（${input.reason}）` : '';
    const dcText = dc === DEFAULT_CHECK_DC ? '' : `，DC ${dc}`;
    return {
      checkType: input.checkType,
      target: input.target,
      difficulty: input.difficulty,
      roll: result.roll,
      threshold: result.threshold,
      outcome: result.outcome,
      baseValue,
      dc,
      text: `${label}检定${reasonText} 1D100 → ${result.roll} / ${result.threshold}，${result.outcome}（${result.difficultyLabel}，${baseLabel} ${baseValue}${dcText}）`,
    };
  },
});

export const createTempNpcSkill = createSkill<
  CreateTempNpcInput,
  {
    kind: 'temp_npc';
    npc: {
      name: string;
      occupation: string;
      role: 'ally' | 'neutral' | 'enemy';
      personality: string;
      appearance: string;
      attributes: Record<AttributeKey, number>;
      hp: number;
      generatedAt: string;
    };
  }
>({
  name: 'create_temp_npc',
  version: 1,
  title: '创建临时 NPC',
  description: '为现场交互需要的临时 NPC 生成即时人物卡。',
  group: 'gameplay',
  executionMode: 'native',
  whenToUse: ['玩家与未预设的酒保、路人、门卫、店员、目击者等交互时。'],
  forbidden: ['对关键 NPC 使用这个 skill 替代正式档案。', '同一个临时 NPC 反复重建导致设定漂移。'],
  inputSchema: objectSchema(
    {
      name: stringSchema('NPC 姓名。'),
      occupation: stringSchema('职业或身份。'),
      role: enumSchema(['ally', 'neutral', 'enemy'], '与玩家的关系。', { default: 'neutral' }),
      personality: stringSchema('人物性格或行为特征。'),
      appearance: stringSchema('外貌简述，可留空。'),
      source: enumSchema(['ai', 'manual', 'demo'], '产物来源，可留空。'),
    },
    ['name', 'occupation', 'role', 'personality'],
    '临时 NPC 创建参数。',
  ),
  outputSchema: objectSchema(
    {
      kind: { type: 'string', const: 'temp_npc', description: '结果类型。' },
      npc: objectSchema(
        {
          name: stringSchema('NPC 姓名。'),
          occupation: stringSchema('职业或身份。'),
          role: enumSchema(['ally', 'neutral', 'enemy'], '关系。'),
          personality: stringSchema('性格。'),
          appearance: stringSchema('外貌。'),
          attributes: objectSchema(
            {
              strength: integerSchema('力量。'),
              dexterity: integerSchema('敏捷。'),
              constitution: integerSchema('体质。'),
              size: integerSchema('体型。'),
              intelligence: integerSchema('智力。'),
              willpower: integerSchema('意志。'),
              appearance: integerSchema('外貌。'),
              education: integerSchema('教育。'),
            },
            ['strength', 'dexterity', 'constitution', 'size', 'intelligence', 'willpower', 'appearance', 'education'],
            'NPC 属性。',
          ),
          hp: integerSchema('生命值。', { minimum: 1 }),
          generatedAt: stringSchema('生成时间。'),
        },
        ['name', 'occupation', 'role', 'personality', 'appearance', 'attributes', 'hp', 'generatedAt'],
        '结构化临时 NPC 卡。',
      ),
    },
    ['kind', 'npc'],
    '临时 NPC 创建结果。',
  ),
  parseInput: (input) => createTempNpcInputSchema.parse(input),
  execute: (input, context) => {
    const strength = rollAttribute3d6(context.randomFn);
    const dexterity = rollAttribute3d6(context.randomFn);
    const constitution = rollAttribute3d6(context.randomFn);
    const size = rollAttribute2d6p6(context.randomFn);
    const intelligence = rollAttribute2d6p6(context.randomFn);
    const willpower = rollAttribute3d6(context.randomFn);
    const appearance = rollAttribute3d6(context.randomFn);
    const education = rollAttribute2d6p6(context.randomFn);
    const hp = Math.floor((constitution + size) / 10);

    return {
      kind: 'temp_npc',
      npc: {
        name: input.name,
        occupation: input.occupation,
        role: input.role,
        personality: input.personality,
        appearance: input.appearance ?? '',
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
      },
    };
  },
});

export const roleplayNpcSkill = createSkill<
  RoleplayNpcInput,
  { kind: 'roleplay_npc'; npc?: ScriptDefinition['npcProfiles'][number]; error?: string }
>({
  name: 'roleplay_npc',
  version: 1,
  title: '读取关键 NPC 档案',
  description: '在扮演关键 NPC 前先读取模组中的预设档案。',
  group: 'gameplay',
  executionMode: 'native',
  whenToUse: ['需要让关键 NPC 开口说话时。', '需要引用关键 NPC 的立场、能力、秘密或战术时。'],
  forbidden: ['不查档案就自由发挥关键 NPC。', '给 NPC 添加模组中不存在的重要设定。'],
  inputSchema: objectSchema(
    {
      nameOrId: stringSchema('NPC 的 id 或姓名。'),
    },
    ['nameOrId'],
    '关键 NPC 查询参数。',
  ),
  outputSchema: objectSchema(
    {
      kind: { type: 'string', const: 'roleplay_npc', description: '结果类型。' },
      npc: nullableSchema(GENERIC_OBJECT_SCHEMA),
      error: stringSchema('未命中时的错误信息。'),
    },
    ['kind'],
    '关键 NPC 档案查询结果。',
  ),
  parseInput: (input) => roleplayNpcInputSchema.parse(input),
  execute: (input, context) => {
    const script = requireScript(context);
    const query = input.nameOrId.trim();
    const profile =
      script.npcProfiles.find((npc) => npc.id === query) ??
      script.npcProfiles.find((npc) => npc.name === query) ??
      script.npcProfiles.find((npc) => npc.name.includes(query));
    if (!profile) {
      return { kind: 'roleplay_npc', error: `未找到名为 "${query}" 的 NPC 档案` };
    }
    return { kind: 'roleplay_npc', npc: profile };
  },
});

export const gameplaySkills = [rollDiceSkill, createTempNpcSkill, roleplayNpcSkill];
