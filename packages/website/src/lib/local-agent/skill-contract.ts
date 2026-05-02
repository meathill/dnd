import type { CharacterRecord, ScriptDefinition } from '../game/types.ts';

export type LocalAgentSkillGroup = 'rulebook' | 'module' | 'gameplay' | 'record';

export type LocalAgentExecutionMode = 'native' | 'model';

export type JsonSchema = {
  type?: string | string[];
  description?: string;
  enum?: string[];
  const?: string | number | boolean;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
};

export type LocalAgentSkillContract = {
  name: string;
  version: 1;
  title: string;
  description: string;
  group: LocalAgentSkillGroup;
  executionMode: LocalAgentExecutionMode;
  whenToUse: string[];
  forbidden: string[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
};

export type LocalAgentRuntimeContext = {
  rootDir: string;
  script?: ScriptDefinition;
  character?: CharacterRecord;
  randomFn?: () => number;
};

export type LocalAgentExecutableSkill<Input, Output> = LocalAgentSkillContract & {
  executionMode: 'native';
  parseInput: (input: unknown) => Input;
  execute: (input: Input, context: LocalAgentRuntimeContext) => Promise<Output> | Output;
};

export type LocalAgentSkillDefinition<Input, Output> = LocalAgentSkillContract & {
  parseInput?: (input: unknown) => Input;
  execute?: (input: Input, context: LocalAgentRuntimeContext) => Promise<Output> | Output;
};

export function isExecutableLocalAgentSkill<Input, Output>(
  skill: LocalAgentSkillDefinition<Input, Output>,
): skill is LocalAgentExecutableSkill<Input, Output> {
  return (
    skill.executionMode === 'native' && typeof skill.parseInput === 'function' && typeof skill.execute === 'function'
  );
}

export function serializeLocalAgentSkill(skill: LocalAgentSkillDefinition<unknown, unknown>): LocalAgentSkillContract {
  return {
    name: skill.name,
    version: skill.version,
    title: skill.title,
    description: skill.description,
    group: skill.group,
    executionMode: skill.executionMode,
    whenToUse: [...skill.whenToUse],
    forbidden: [...skill.forbidden],
    inputSchema: skill.inputSchema,
    outputSchema: skill.outputSchema,
  };
}

export function stringSchema(description: string, options: Partial<JsonSchema> = {}): JsonSchema {
  return { type: 'string', description, ...options };
}

export function numberSchema(description: string, options: Partial<JsonSchema> = {}): JsonSchema {
  return { type: 'number', description, ...options };
}

export function integerSchema(description: string, options: Partial<JsonSchema> = {}): JsonSchema {
  return { type: 'integer', description, ...options };
}

export function booleanSchema(description: string, options: Partial<JsonSchema> = {}): JsonSchema {
  return { type: 'boolean', description, ...options };
}

export function enumSchema(values: string[], description: string, options: Partial<JsonSchema> = {}): JsonSchema {
  return { type: 'string', enum: values, description, ...options };
}

export function arraySchema(items: JsonSchema, description: string, options: Partial<JsonSchema> = {}): JsonSchema {
  return { type: 'array', items, description, ...options };
}

export function objectSchema(
  properties: Record<string, JsonSchema>,
  required: string[],
  description: string,
  options: Partial<JsonSchema> = {},
): JsonSchema {
  return {
    type: 'object',
    properties,
    required,
    description,
    additionalProperties: false,
    ...options,
  };
}

export function nullableSchema(schema: JsonSchema): JsonSchema {
  const nextType = Array.isArray(schema.type)
    ? Array.from(new Set([...schema.type, 'null']))
    : schema.type
      ? [schema.type, 'null']
      : ['null'];
  return {
    ...schema,
    type: nextType,
  };
}

export const GENERIC_OBJECT_SCHEMA: JsonSchema = {
  type: 'object',
  description: '结构化对象，由宿主根据上下文继续消费。',
  additionalProperties: true,
};
