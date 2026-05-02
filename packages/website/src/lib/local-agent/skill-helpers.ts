import { z } from 'zod';
import { resolveTrainedSkillValue, resolveUntrainedSkillValue, rollDie } from '../game/rules.ts';
import type { AttributeKey, CharacterRecord, RulebookEntity, ScriptDefinition } from '../game/types.ts';
import type { LocalCharacterFile, LocalModuleFile, LocalReportMetadata } from './file-repository.ts';
import {
  enumSchema,
  GENERIC_OBJECT_SCHEMA,
  integerSchema,
  objectSchema,
  stringSchema,
  type JsonSchema,
  type LocalAgentExecutableSkill,
  type LocalAgentRuntimeContext,
} from './skill-contract.ts';

export type RollDiceCheckType = 'skill' | 'attribute' | 'luck' | 'sanity' | 'combat';

export const localArtifactSourceSchema = z.enum(['ai', 'manual', 'demo']);

export const attributeAliasMap: Record<string, AttributeKey> = {
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

export const sceneRiskLevelSchema = enumSchema(['low', 'moderate', 'high', 'deadly'], '风险等级。');

export const rulebookEntityTypeSchema = enumSchema(
  ['rule', 'skill', 'occupation_template', 'npc_template', 'creature', 'hazard', 'sanity_loss', 'scene_risk_guideline'],
  '规则书实体类型。',
);

export function createSkill<Input, Output>(
  skill: LocalAgentExecutableSkill<Input, Output>,
): LocalAgentExecutableSkill<Input, Output> {
  return skill;
}

export function requireScript(context: LocalAgentRuntimeContext): ScriptDefinition {
  if (!context.script) {
    throw new Error('当前 skill 需要 script 上下文');
  }
  return context.script;
}

export function requireCharacter(context: LocalAgentRuntimeContext): CharacterRecord {
  if (!context.character) {
    throw new Error('当前 skill 需要 character 上下文');
  }
  return context.character;
}

export function resolveAttributeValue(character: CharacterRecord, label: string): number | null {
  const key = attributeAliasMap[label.trim()];
  if (!key) {
    return null;
  }
  const value = character.attributes[key];
  return typeof value === 'number' ? value : null;
}

export function resolveSkillId(script: ScriptDefinition, label: string): string | null {
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

export function resolveSkillValue(character: CharacterRecord, script: ScriptDefinition, skillId: string): number {
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

export function buildCheckKey(checkType: RollDiceCheckType, target: string, script: ScriptDefinition): string {
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

export function rollLocalDie(sides: number, randomFn?: () => number): number {
  if (!randomFn) {
    return rollDie(sides);
  }
  return Math.floor(randomFn() * sides) + 1;
}

export function rollAttribute3d6(randomFn?: () => number): number {
  return (rollLocalDie(6, randomFn) + rollLocalDie(6, randomFn) + rollLocalDie(6, randomFn)) * 5;
}

export function rollAttribute2d6p6(randomFn?: () => number): number {
  return (rollLocalDie(6, randomFn) + rollLocalDie(6, randomFn) + 6) * 5;
}

export function buildListItemSchema(description: string): JsonSchema {
  return objectSchema(
    {
      kind: enumSchema(['module', 'character', 'report'], '产物类型。'),
      id: stringSchema('产物 id。'),
      title: stringSchema('标题。'),
      updatedAt: stringSchema('更新时间。'),
      filePath: stringSchema('相对文件路径。'),
    },
    ['kind', 'id', 'title', 'updatedAt', 'filePath'],
    description,
  );
}

export function buildLocalModuleFileSchema(description: string): JsonSchema {
  return objectSchema(
    {
      schemaVersion: integerSchema('schema 版本。'),
      kind: { type: 'string', const: 'module', description: '产物类型。' },
      id: stringSchema('模组 id。'),
      title: stringSchema('模组标题。'),
      rulesetId: stringSchema('规则系统 id。'),
      source: enumSchema(['ai', 'manual', 'demo'], '产物来源。'),
      createdAt: stringSchema('创建时间。'),
      updatedAt: stringSchema('更新时间。'),
      data: GENERIC_OBJECT_SCHEMA,
    },
    ['schemaVersion', 'kind', 'id', 'title', 'rulesetId', 'source', 'createdAt', 'updatedAt', 'data'],
    description,
  );
}

export function buildLocalCharacterFileSchema(description: string): JsonSchema {
  return objectSchema(
    {
      schemaVersion: integerSchema('schema 版本。'),
      kind: { type: 'string', const: 'character', description: '产物类型。' },
      id: stringSchema('角色 id。'),
      moduleId: stringSchema('所属模组 id。'),
      name: stringSchema('角色名称。'),
      source: enumSchema(['ai', 'manual', 'demo'], '产物来源。'),
      createdAt: stringSchema('创建时间。'),
      updatedAt: stringSchema('更新时间。'),
      data: GENERIC_OBJECT_SCHEMA,
    },
    ['schemaVersion', 'kind', 'id', 'moduleId', 'name', 'source', 'createdAt', 'updatedAt', 'data'],
    description,
  );
}

export function buildLocalReportMetadataSchema(description: string): JsonSchema {
  return objectSchema(
    {
      kind: { type: 'string', const: 'report', description: '产物类型。' },
      id: stringSchema('战报 id。'),
      title: stringSchema('战报标题。'),
      moduleId: stringSchema('所属模组 id。'),
      characterId: stringSchema('关联角色 id，可留空。'),
      source: enumSchema(['ai', 'manual', 'demo'], '产物来源。'),
      createdAt: stringSchema('创建时间。'),
      updatedAt: stringSchema('更新时间。'),
      summary: stringSchema('摘要，可留空。'),
    },
    ['kind', 'id', 'title', 'moduleId', 'source', 'createdAt', 'updatedAt'],
    description,
  );
}

export function buildRulebookEntitySchema(description: string): JsonSchema {
  return objectSchema(
    {
      rulesetId: stringSchema('规则系统 id。'),
      type: rulebookEntityTypeSchema,
      id: stringSchema('实体 id。'),
      name: stringSchema('实体名称。'),
      summary: stringSchema('实体摘要。'),
      tags: { type: 'array', items: stringSchema('标签。'), description: '标签列表。' },
      source: stringSchema('来源标记。'),
      data: GENERIC_OBJECT_SCHEMA,
    },
    ['rulesetId', 'type', 'id', 'name', 'summary', 'tags', 'source', 'data'],
    description,
  );
}

export function toSerializableRulebookEntity(entity: RulebookEntity): RulebookEntity {
  return {
    rulesetId: entity.rulesetId,
    type: entity.type,
    id: entity.id,
    name: entity.name,
    summary: entity.summary,
    tags: [...entity.tags],
    source: entity.source,
    data: entity.data,
  };
}

export type SaveLocalModuleResult = { filePath: string; artifact: LocalModuleFile };

export type SaveLocalCharacterResult = { filePath: string; artifact: LocalCharacterFile };

export type SaveLocalReportResult = { filePath: string; metadata: LocalReportMetadata };
