import {
  DEFAULT_CHECK_DC,
  checkAttribute,
  checkLuck,
  checkSanity,
  checkSkill,
  resolveCheckDc,
  resolveTrainedSkillValue,
  resolveUntrainedSkillValue,
} from './rules';
import type { ChatModule, CharacterRecord, GameRuleOverrides, ScriptDefinition } from './types';
import type { ActionSpec, InputAnalysis } from './input-analyzer';

type ActionExecution = {
  summary: string;
  modules: ChatModule[];
  ruleUpdates: Record<string, number>;
};

const attributeAliasMap: Record<string, keyof CharacterRecord['attributes']> = {
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

function resolveAttributeValue(character: CharacterRecord, label: string): number | null {
  const key = attributeAliasMap[label.trim()];
  if (!key) {
    return null;
  }
  const value = character.attributes[key];
  return typeof value === 'number' ? value : null;
}

function resolveSkillLabel(script: ScriptDefinition, skillId: string): string {
  return script.skillOptions.find((option) => option.id === skillId)?.label ?? skillId;
}

function resolveSkillId(script: ScriptDefinition, label: string): string | null {
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

function resolveAttributeKey(label: string): string | null {
  const key = attributeAliasMap[label.trim()];
  return key ?? null;
}

function buildCheckKey(action: ActionSpec, script: ScriptDefinition): string | null {
  if (action.type === 'attack') {
    const skillId = resolveSkillId(script, action.skill) ?? action.skill.trim();
    return skillId ? `attack:${skillId}` : null;
  }
  if (action.type !== 'check') {
    return null;
  }
  if (action.checkType === 'luck') {
    return 'luck';
  }
  if (action.checkType === 'sanity') {
    return 'sanity';
  }
  if (action.checkType === 'attribute') {
    const attrKey = resolveAttributeKey(action.target);
    return `attribute:${attrKey ?? (action.target.trim() || 'unknown')}`;
  }
  if (action.checkType === 'skill' || action.checkType === 'combat') {
    const skillId = resolveSkillId(script, action.target) ?? action.target.trim();
    return skillId ? `skill:${skillId}` : null;
  }
  return null;
}

function resolveSkillValue(character: CharacterRecord, script: ScriptDefinition, skillId: string): number {
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

function formatCheckLine({
  label,
  roll,
  threshold,
  outcome,
  difficultyLabel,
  baseLabel,
  baseValue,
  dc,
}: {
  label: string;
  roll: number;
  threshold: number;
  outcome: string;
  difficultyLabel: string;
  baseLabel: string;
  baseValue: number;
  dc: number;
}): string {
  const dcText = dc === DEFAULT_CHECK_DC ? '' : `，DC ${dc}`;
  return `${label}检定 1D100 → ${roll} / ${threshold}，${outcome}（${difficultyLabel}，${baseLabel} ${baseValue}${dcText}）`;
}

function formatAttackLine({
  label,
  roll,
  threshold,
  outcome,
  difficultyLabel,
  baseValue,
  dc,
}: {
  label: string;
  roll: number;
  threshold: number;
  outcome: string;
  difficultyLabel: string;
  baseValue: number;
  dc: number;
}): string {
  const dcText = dc === DEFAULT_CHECK_DC ? '' : `，DC ${dc}`;
  return `攻击判定（${label}）1D100 → ${roll} / ${threshold}，${outcome}（${difficultyLabel}，技能值 ${baseValue}${dcText}）`;
}

function executeCheck({
  action,
  script,
  character,
  gameRules,
  randomFn,
  ruleUpdates,
}: {
  action: Extract<ActionSpec, { type: 'check' }>;
  script: ScriptDefinition;
  character: CharacterRecord;
  gameRules: GameRuleOverrides | undefined;
  randomFn: () => number;
  ruleUpdates: Record<string, number>;
}): string {
  const checkKey = buildCheckKey(action, script);
  const { dc, shouldPersist } = resolveCheckDc({
    targetKey: checkKey ?? 'check:unknown',
    aiDc: action.dc,
    scriptRules: script.rules,
    gameOverrides: gameRules?.checkDcOverrides,
  });
  if (shouldPersist && checkKey) {
    ruleUpdates[checkKey] = dc;
  }

  const difficulty = action.difficulty;
  if (action.checkType === 'luck') {
    const luckValue = character.luck ?? 0;
    const result = checkLuck(dc, luckValue, difficulty, randomFn);
    return formatCheckLine({
      label: '幸运',
      roll: result.roll,
      threshold: result.threshold,
      outcome: result.outcome,
      difficultyLabel: result.difficultyLabel,
      baseLabel: '幸运值',
      baseValue: luckValue,
      dc,
    });
  }
  if (action.checkType === 'sanity') {
    const sanityValue = Math.max(0, Math.floor(character.attributes.willpower ?? 0));
    const result = checkSanity(dc, sanityValue, difficulty, randomFn);
    return formatCheckLine({
      label: '理智',
      roll: result.roll,
      threshold: result.threshold,
      outcome: result.outcome,
      difficultyLabel: result.difficultyLabel,
      baseLabel: '理智值',
      baseValue: sanityValue,
      dc,
    });
  }
  if (action.checkType === 'attribute') {
    const label = action.target.trim() || '属性';
    const value = resolveAttributeValue(character, action.target);
    if (!value || value <= 0) {
      return `${label} 1D100 → ${checkSkill(dc, 0, difficulty, randomFn).roll}（未配置检定值）`;
    }
    const result = checkAttribute(dc, value, difficulty, randomFn);
    return formatCheckLine({
      label,
      roll: result.roll,
      threshold: result.threshold,
      outcome: result.outcome,
      difficultyLabel: result.difficultyLabel,
      baseLabel: '属性值',
      baseValue: value,
      dc,
    });
  }
  const skillLabel = action.target.trim() || '技能';
  const skillId = resolveSkillId(script, action.target) ?? action.target.trim();
  const resolvedSkillLabel = skillId ? resolveSkillLabel(script, skillId) : skillLabel;
  const value = skillId ? resolveSkillValue(character, script, skillId) : resolveUntrainedSkillValue(script.rules);
  const result = checkSkill(dc, value, difficulty, randomFn);
  return formatCheckLine({
    label: resolvedSkillLabel,
    roll: result.roll,
    threshold: result.threshold,
    outcome: result.outcome,
    difficultyLabel: result.difficultyLabel,
    baseLabel: '技能值',
    baseValue: value,
    dc,
  });
}

function executeAttack({
  action,
  script,
  character,
  gameRules,
  randomFn,
  ruleUpdates,
}: {
  action: Extract<ActionSpec, { type: 'attack' }>;
  script: ScriptDefinition;
  character: CharacterRecord;
  gameRules: GameRuleOverrides | undefined;
  randomFn: () => number;
  ruleUpdates: Record<string, number>;
}): string {
  const checkKey = buildCheckKey(action, script);
  const { dc, shouldPersist } = resolveCheckDc({
    targetKey: checkKey ?? 'attack:unknown',
    aiDc: action.dc,
    scriptRules: script.rules,
    gameOverrides: gameRules?.checkDcOverrides,
  });
  if (shouldPersist && checkKey) {
    ruleUpdates[checkKey] = dc;
  }
  const skillId = resolveSkillId(script, action.skill) ?? action.skill.trim();
  const label = skillId ? resolveSkillLabel(script, skillId) : action.skill.trim() || '攻击';
  const targetLabel = action.target.trim() ? `${label} 对 ${action.target.trim()}` : label;
  const value = skillId ? resolveSkillValue(character, script, skillId) : resolveUntrainedSkillValue(script.rules);
  const result = checkSkill(dc, value, action.difficulty, randomFn);
  return formatAttackLine({
    label: targetLabel,
    roll: result.roll,
    threshold: result.threshold,
    outcome: result.outcome,
    difficultyLabel: result.difficultyLabel,
    baseValue: value,
    dc,
  });
}

export function executeActionPlan({
  analysis,
  script,
  character,
  gameRules,
  randomFn = Math.random,
}: {
  analysis: InputAnalysis;
  script: ScriptDefinition;
  character: CharacterRecord;
  gameRules?: GameRuleOverrides;
  randomFn?: () => number;
}): ActionExecution {
  const modules: ChatModule[] = [];
  const summaryLines: string[] = [];
  const ruleUpdates: Record<string, number> = {};
  const actions =
    analysis.actions.length > 0
      ? analysis.actions
      : analysis.needsDice
        ? [
            {
              type: 'check',
              checkType: analysis.diceType,
              target: analysis.diceTarget,
              dc: DEFAULT_CHECK_DC,
              difficulty: analysis.difficulty,
              reason: '',
            },
          ]
        : [];

  for (const action of actions) {
    if (action.type === 'check') {
      const line = executeCheck({
        action,
        script,
        character,
        gameRules,
        randomFn,
        ruleUpdates,
      });
      if (line) {
        summaryLines.push(line);
      }
      continue;
    }
    if (action.type === 'attack') {
      const line = executeAttack({
        action,
        script,
        character,
        gameRules,
        randomFn,
        ruleUpdates,
      });
      if (line) {
        summaryLines.push(line);
      }
      continue;
    }
    if (action.type === 'npc') {
      const target = action.target.trim() || 'NPC';
      const intent = action.intent.trim() || '行动';
      summaryLines.push(`NPC 行动建议：${target} - ${intent}`);
    }
  }

  if (summaryLines.length > 0) {
    modules.push({ type: 'dice', content: summaryLines.join('\n') });
  }

  return {
    summary: summaryLines.join('\n'),
    modules,
    ruleUpdates,
  };
}
