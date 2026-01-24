import type { CharacterPayload } from '../game/validators';
import type {
  AttributeKey,
  AttributeRangeMap,
  ScriptDefinition,
  ScriptEncounter,
  ScriptScene,
  ScriptSkillOption,
} from '../game/types';

type ScriptRow = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  skill_options_json: string;
  equipment_options_json: string;
  occupation_options_json: string;
  origin_options_json: string;
  buff_options_json: string;
  debuff_options_json: string;
  attribute_ranges_json: string;
  attribute_point_budget: string | number | null;
  skill_limit: string | number | null;
  equipment_limit: string | number | null;
  buff_limit: string | number | null;
  debuff_limit: string | number | null;
  scenes_json: string;
  encounters_json: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function parseJsonArray<T>(raw: string): T[] {
  try {
    const data = JSON.parse(raw) as T[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function parseJsonRecord(raw: string): JsonRecord {
  try {
    const data = JSON.parse(raw) as JsonRecord;
    return isRecord(data) ? data : {};
  } catch {
    return {};
  }
}

function parseAttributeRanges(raw: string): AttributeRangeMap {
  const data = parseJsonRecord(raw);
  const result: AttributeRangeMap = {};
  for (const [key, value] of Object.entries(data)) {
    if (!isRecord(value)) {
      continue;
    }
    const min = value.min;
    const max = value.max;
    if (typeof min === 'number' && typeof max === 'number') {
      result[key as AttributeKey] = { min, max };
    }
  }
  return result;
}

function parseLimit(value: string | number | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapScriptRow(row: ScriptRow): ScriptDefinition {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    setting: row.setting,
    difficulty: row.difficulty,
    skillOptions: parseJsonArray<ScriptSkillOption>(row.skill_options_json),
    equipmentOptions: parseJsonArray<string>(row.equipment_options_json),
    occupationOptions: parseJsonArray<string>(row.occupation_options_json),
    originOptions: parseJsonArray<string>(row.origin_options_json),
    buffOptions: parseJsonArray<string>(row.buff_options_json),
    debuffOptions: parseJsonArray<string>(row.debuff_options_json),
    attributeRanges: parseAttributeRanges(row.attribute_ranges_json),
    attributePointBudget: parseLimit(row.attribute_point_budget),
    skillLimit: parseLimit(row.skill_limit),
    equipmentLimit: parseLimit(row.equipment_limit),
    buffLimit: parseLimit(row.buff_limit),
    debuffLimit: parseLimit(row.debuff_limit),
    scenes: parseJsonArray<ScriptScene>(row.scenes_json),
    encounters: parseJsonArray<ScriptEncounter>(row.encounters_json),
  };
}

export function serializeCharacterPayload(payload: CharacterPayload) {
  return {
    name: payload.name,
    occupation: payload.occupation,
    age: payload.age,
    origin: payload.origin,
    appearance: payload.appearance,
    background: payload.background,
    motivation: payload.motivation,
    attributes_json: JSON.stringify(payload.attributes),
    skills_json: JSON.stringify(payload.skills),
    inventory_json: JSON.stringify(payload.inventory),
    buffs_json: JSON.stringify(payload.buffs),
    debuffs_json: JSON.stringify(payload.debuffs),
    note: payload.note,
  };
}

export function serializeScriptDefinition(script: ScriptDefinition) {
  return {
    id: script.id,
    title: script.title,
    summary: script.summary,
    setting: script.setting,
    difficulty: script.difficulty,
    skill_options_json: JSON.stringify(script.skillOptions),
    equipment_options_json: JSON.stringify(script.equipmentOptions),
    occupation_options_json: JSON.stringify(script.occupationOptions),
    origin_options_json: JSON.stringify(script.originOptions),
    buff_options_json: JSON.stringify(script.buffOptions),
    debuff_options_json: JSON.stringify(script.debuffOptions),
    attribute_ranges_json: JSON.stringify(script.attributeRanges),
    attribute_point_budget: script.attributePointBudget,
    skill_limit: script.skillLimit,
    equipment_limit: script.equipmentLimit,
    buff_limit: script.buffLimit,
    debuff_limit: script.debuffLimit,
    scenes_json: JSON.stringify(script.scenes),
    encounters_json: JSON.stringify(script.encounters),
  };
}
