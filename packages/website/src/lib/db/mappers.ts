import type { CharacterPayload } from '../game/validators';
import type {
  AttributeKey,
  AttributeRangeMap,
  ScriptDefinition,
  ScriptBackground,
  ScriptEncounter,
  ScriptNpcProfile,
  ScriptOpeningMessage,
  ScriptStoryArc,
  ScriptScene,
  ScriptRuleOverrides,
  ScriptSkillOption,
  ScriptOccupationOption,
} from '../game/types';

export type ScriptRow = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  opening_messages_json: string;
  background_json: string;
  story_arcs_json: string;
  enemy_profiles_json: string;
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
  rules_json: string;
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

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function parseJsonRecord(raw: string): JsonRecord {
  try {
    const data = JSON.parse(raw) as JsonRecord;
    return isRecord(data) ? data : {};
  } catch {
    return {};
  }
}

function parseScriptBackground(raw: string): ScriptBackground {
  const data = parseJsonRecord(raw);
  const overview = typeof data.overview === 'string' ? data.overview : '';
  const truth = typeof data.truth === 'string' ? data.truth : '';
  return {
    overview,
    truth,
    themes: parseStringArray(data.themes),
    factions: parseStringArray(data.factions),
    locations: parseStringArray(data.locations),
    secrets: parseStringArray(data.secrets),
  };
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

function parseNumberRecord(value: unknown): Record<string, number> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const result: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) {
      continue;
    }
    result[key] = entry;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseNumberArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .filter((entry) => typeof entry === 'number' && Number.isFinite(entry))
    .map((entry) => Math.floor(entry));
  return items.length > 0 ? items : undefined;
}

function parseScriptRules(raw: string): ScriptRuleOverrides {
  const data = parseJsonRecord(raw);
  const rules: ScriptRuleOverrides = {};
  if (typeof data.defaultCheckDc === 'number' && Number.isFinite(data.defaultCheckDc)) {
    rules.defaultCheckDc = data.defaultCheckDc;
  }
  const dcOverrides = parseNumberRecord(data.checkDcOverrides);
  if (dcOverrides) {
    rules.checkDcOverrides = dcOverrides;
  }
  if (typeof data.skillValueTrained === 'number' && Number.isFinite(data.skillValueTrained)) {
    rules.skillValueTrained = data.skillValueTrained;
  }
  if (typeof data.skillValueUntrained === 'number' && Number.isFinite(data.skillValueUntrained)) {
    rules.skillValueUntrained = data.skillValueUntrained;
  }
  if (typeof data.skillPointBudget === 'number' && Number.isFinite(data.skillPointBudget)) {
    rules.skillPointBudget = data.skillPointBudget;
  }
  if (typeof data.skillMaxValue === 'number' && Number.isFinite(data.skillMaxValue)) {
    rules.skillMaxValue = data.skillMaxValue;
  }
  const skillBaseValues = parseNumberRecord(data.skillBaseValues);
  if (skillBaseValues) {
    rules.skillBaseValues = skillBaseValues;
  }
  if (
    data.skillAllocationMode === 'budget' ||
    data.skillAllocationMode === 'selection' ||
    data.skillAllocationMode === 'quickstart'
  ) {
    rules.skillAllocationMode = data.skillAllocationMode;
  }
  const quickstartCoreValues = parseNumberArray(data.quickstartCoreValues);
  if (quickstartCoreValues) {
    rules.quickstartCoreValues = quickstartCoreValues;
  }
  if (typeof data.quickstartInterestCount === 'number' && Number.isFinite(data.quickstartInterestCount)) {
    rules.quickstartInterestCount = Math.max(0, Math.floor(data.quickstartInterestCount));
  }
  if (typeof data.quickstartInterestBonus === 'number' && Number.isFinite(data.quickstartInterestBonus)) {
    rules.quickstartInterestBonus = Math.max(0, Math.floor(data.quickstartInterestBonus));
  }
  return rules;
}

function resolveOccupationId(name: string, rawId: unknown, index: number): string {
  if (typeof rawId === 'string' && rawId.trim()) {
    return rawId.trim();
  }
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  if (slug) {
    return `occupation-${slug}`;
  }
  return `occupation-${index + 1}`;
}

function parseOccupationOptions(raw: string): ScriptOccupationOption[] {
  const data = parseJsonArray<unknown>(raw);
  return data
    .map((entry, index) => {
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) {
          return null;
        }
        return {
          id: resolveOccupationId(name, null, index),
          name,
          summary: '',
          skillIds: [],
          equipment: [],
        };
      }
      if (!isRecord(entry)) {
        return null;
      }
      const rawName =
        typeof entry.name === 'string'
          ? entry.name
          : typeof entry.label === 'string'
            ? entry.label
            : typeof entry.title === 'string'
              ? entry.title
              : '';
      const name = rawName.trim();
      if (!name) {
        return null;
      }
      return {
        id: resolveOccupationId(name, entry.id, index),
        name,
        summary: typeof entry.summary === 'string' ? entry.summary : '',
        skillIds: parseStringArray(entry.skillIds ?? entry.skills),
        equipment: parseStringArray(entry.equipment ?? entry.items),
      };
    })
    .filter((item): item is ScriptOccupationOption => Boolean(item));
}

export function mapScriptRow(row: ScriptRow): ScriptDefinition {
  const npcProfiles = parseJsonArray<Partial<ScriptNpcProfile>>(row.enemy_profiles_json).map((raw, index) => {
    const npc = raw ?? {};
    const id = typeof npc.id === 'string' && npc.id.trim() ? npc.id : `npc-${index + 1}`;
    const roleValue = npc.role === 'ally' || npc.role === 'neutral' || npc.role === 'enemy' ? npc.role : 'enemy';
    return {
      id,
      name: npc.name ?? '',
      type: npc.type ?? '',
      role: roleValue,
      threat: npc.threat ?? '',
      summary: npc.summary ?? '',
      useWhen: npc.useWhen ?? '',
      status: npc.status ?? '',
      hp: typeof npc.hp === 'number' && Number.isFinite(npc.hp) ? npc.hp : 0,
      armor: typeof npc.armor === 'number' && Number.isFinite(npc.armor) ? npc.armor : undefined,
      move: typeof npc.move === 'number' && Number.isFinite(npc.move) ? npc.move : undefined,
      attacks: Array.isArray(npc.attacks) ? npc.attacks : [],
      skills: Array.isArray(npc.skills) ? npc.skills : [],
      traits: Array.isArray(npc.traits) ? npc.traits : [],
      tactics: npc.tactics ?? '',
      weakness: npc.weakness ?? '',
      sanityLoss: npc.sanityLoss ?? '',
    };
  });
  const encounters = parseJsonArray<ScriptEncounter & { enemies?: string[] }>(row.encounters_json).map((encounter) => ({
    ...encounter,
    npcs: Array.isArray(encounter.npcs) ? encounter.npcs : Array.isArray(encounter.enemies) ? encounter.enemies : [],
  }));
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    setting: row.setting,
    difficulty: row.difficulty,
    openingMessages: parseJsonArray<ScriptOpeningMessage>(row.opening_messages_json),
    background: parseScriptBackground(row.background_json),
    storyArcs: parseJsonArray<ScriptStoryArc>(row.story_arcs_json),
    npcProfiles,
    skillOptions: parseJsonArray<ScriptSkillOption>(row.skill_options_json),
    equipmentOptions: parseJsonArray<string>(row.equipment_options_json),
    occupationOptions: parseOccupationOptions(row.occupation_options_json),
    originOptions: parseJsonArray<string>(row.origin_options_json),
    buffOptions: parseJsonArray<string>(row.buff_options_json),
    debuffOptions: parseJsonArray<string>(row.debuff_options_json),
    attributeRanges: parseAttributeRanges(row.attribute_ranges_json),
    attributePointBudget: parseLimit(row.attribute_point_budget),
    skillLimit: parseLimit(row.skill_limit),
    equipmentLimit: parseLimit(row.equipment_limit),
    buffLimit: parseLimit(row.buff_limit),
    debuffLimit: parseLimit(row.debuff_limit),
    rules: parseScriptRules(row.rules_json),
    scenes: parseJsonArray<ScriptScene>(row.scenes_json),
    encounters,
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
    avatar: payload.avatar,
    luck: payload.luck,
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
    opening_messages_json: JSON.stringify(script.openingMessages),
    background_json: JSON.stringify(script.background),
    story_arcs_json: JSON.stringify(script.storyArcs),
    enemy_profiles_json: JSON.stringify(script.npcProfiles),
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
    rules_json: JSON.stringify(script.rules ?? {}),
    scenes_json: JSON.stringify(script.scenes),
    encounters_json: JSON.stringify(script.encounters),
  };
}
