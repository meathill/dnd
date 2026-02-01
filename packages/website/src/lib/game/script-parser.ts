import type {
  ScriptDefinition,
  ScriptOpeningMessage,
  ScriptBackground,
  ScriptStoryArc,
  ScriptNpcProfile,
  ScriptSkillOption,
  ScriptScene,
  ScriptEncounter,
  ScriptRuleOverrides,
  AttributeRangeMap,
} from './types';

type JsonRecord = Record<string, unknown>;

type ScriptParseResult = { ok: true; value: ScriptDefinition } | { ok: false; error: string };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function parseRequiredString(
  value: unknown,
  label: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    return { ok: false, error: `缺少${label}` };
  }
  return { ok: true, value: text };
}

function parseOptionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseObjectArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is T => typeof item === 'object' && item !== null) as T[];
}

function parseBackground(value: unknown): ScriptBackground {
  if (!isRecord(value)) {
    return { overview: '', truth: '', themes: [], factions: [], locations: [], secrets: [] };
  }
  return {
    overview: parseOptionalString(value.overview),
    truth: parseOptionalString(value.truth),
    themes: parseStringArray(value.themes),
    factions: parseStringArray(value.factions),
    locations: parseStringArray(value.locations),
    secrets: parseStringArray(value.secrets),
  };
}

function parseRuleOverrides(value: unknown): ScriptRuleOverrides {
  if (!isRecord(value)) {
    return {};
  }
  return value as ScriptRuleOverrides;
}

function parseAttributeRanges(value: unknown): AttributeRangeMap {
  if (!isRecord(value)) {
    return {};
  }
  return value as AttributeRangeMap;
}

export function parseScriptDefinition(payload: unknown, id: string): ScriptParseResult {
  if (!isRecord(payload)) {
    return { ok: false, error: '参数不合法' };
  }

  const title = parseRequiredString(payload.title, '标题');
  if (!title.ok) {
    return title;
  }
  const summary = parseRequiredString(payload.summary, '简介');
  if (!summary.ok) {
    return summary;
  }
  const setting = parseRequiredString(payload.setting, '时代背景');
  if (!setting.ok) {
    return setting;
  }
  const difficulty = parseRequiredString(payload.difficulty, '难度');
  if (!difficulty.ok) {
    return difficulty;
  }

  const encountersInput = parseObjectArray<ScriptEncounter & { enemies?: string[] }>(payload.encounters);
  const encounters = encountersInput.map((encounter) => ({
    ...encounter,
    npcs: Array.isArray(encounter.npcs) ? encounter.npcs : Array.isArray(encounter.enemies) ? encounter.enemies : [],
  }));

  const npcProfiles = parseObjectArray<ScriptNpcProfile>(
    (payload as { npcProfiles?: unknown; enemyProfiles?: unknown }).npcProfiles ??
      (payload as { enemyProfiles?: unknown }).enemyProfiles,
  );

  const script: ScriptDefinition = {
    id,
    title: title.value,
    summary: summary.value,
    setting: setting.value,
    difficulty: difficulty.value,
    openingMessages: parseObjectArray<ScriptOpeningMessage>(payload.openingMessages),
    background: parseBackground(payload.background),
    storyArcs: parseObjectArray<ScriptStoryArc>(payload.storyArcs),
    npcProfiles,
    skillOptions: parseObjectArray<ScriptSkillOption>(payload.skillOptions),
    equipmentOptions: parseStringArray(payload.equipmentOptions),
    occupationOptions: parseStringArray(payload.occupationOptions),
    originOptions: parseStringArray(payload.originOptions),
    buffOptions: parseStringArray(payload.buffOptions),
    debuffOptions: parseStringArray(payload.debuffOptions),
    attributeRanges: parseAttributeRanges(payload.attributeRanges),
    attributePointBudget: parseNumber(payload.attributePointBudget),
    skillLimit: parseNumber(payload.skillLimit),
    equipmentLimit: parseNumber(payload.equipmentLimit),
    buffLimit: parseNumber(payload.buffLimit),
    debuffLimit: parseNumber(payload.debuffLimit),
    rules: parseRuleOverrides(payload.rules),
    scenes: parseObjectArray<ScriptScene>(payload.scenes),
    encounters,
  };

  return { ok: true, value: script };
}
