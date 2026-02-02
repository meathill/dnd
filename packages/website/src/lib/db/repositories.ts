import type {
  AttributeKey,
  ScriptDefinition,
  CharacterRecord,
  GameRecord,
  GameRecordSummary,
  ChatRole,
  ChatModule,
  GameMessageRecord,
  GameMemoryRecord,
  GameMemoryRoundSummary,
  GameMemoryState,
  GameMemoryMapRecord,
  DmProfile,
  DmProfileSummary,
  DmProfileRule,
  DmGuidePhase,
  DmProfileDetail,
} from '../game/types';
import type { CharacterPayload, CreateGamePayload } from '../game/validators';
import { DEFAULT_TRAINED_SKILL_VALUE, DEFAULT_UNTRAINED_SKILL_VALUE } from '../game/rules';
import { parseMemoryState, parseRoundSummaries } from '../game/memory';
import { mapScriptRow, serializeCharacterPayload, serializeScriptDefinition } from './mappers';
import type { ScriptRow } from './mappers';
import type { UserSettings } from '../session/session-types';
import { normalizeModel } from '../ai/ai-models';

const SCRIPT_COLUMNS =
  'id, title, summary, setting, difficulty, opening_messages_json, background_json, story_arcs_json, enemy_profiles_json, skill_options_json, equipment_options_json, occupation_options_json, origin_options_json, buff_options_json, debuff_options_json, attribute_ranges_json, attribute_point_budget, skill_limit, equipment_limit, buff_limit, debuff_limit, rules_json, scenes_json, encounters_json';
const GAME_SUMMARY_COLUMNS =
  'g.id as id, g.script_id as script_id, g.character_id as character_id, g.status as status, g.updated_at as updated_at, s.title as script_title, c.name as character_name';

type GameSummaryRow = {
  id: string;
  script_id: string;
  character_id: string;
  status: string;
  updated_at: string;
  script_title: string;
  character_name: string;
};

type CharacterRow = {
  id: string;
  script_id: string;
  name: string;
  occupation: string;
  age: string;
  origin: string;
  appearance: string;
  background: string;
  motivation: string;
  avatar: string;
  luck: string | number;
  attributes_json: string;
  skills_json: string;
  inventory_json: string;
  buffs_json: string;
  debuffs_json: string;
  note: string;
  created_at: string;
  updated_at: string;
};

type UserSettingsRow = {
  ai_provider: string;
  ai_fast_model: string;
  ai_general_model: string;
  dm_profile_id: string | null;
};

type DmProfileRow = {
  id: string;
  name: string;
  summary: string;
  analysis_guide: string;
  narration_guide: string;
  is_default: number;
  created_at: string;
  updated_at: string;
};

type DmProfileSummaryRow = {
  id: string;
  name: string;
  summary: string;
  is_default: number;
};

type DmProfileRuleRow = {
  id: string;
  dm_profile_id: string;
  phase: string;
  category: string;
  title: string;
  content: string;
  order_num: number;
  is_enabled: number;
  created_at: string;
  updated_at: string;
};

type UserRoleRow = {
  role: string;
};

type GameMessageRow = {
  id: string;
  game_id: string;
  role: string;
  speaker: string;
  content: string;
  modules_json: string;
  created_at: string;
  updated_at: string;
};

type GameMemoryRow = {
  id: string;
  game_id: string;
  last_round_index: number | string;
  last_processed_at: string;
  short_summary: string;
  long_summary: string;
  recent_rounds_json: string;
  state_json: string;
  created_at: string;
  updated_at: string;
};

type GameMemoryMapRow = {
  id: string;
  game_id: string;
  round_index: number | string;
  content: string;
  created_at: string;
};

type GameRow = {
  id: string;
  script_id: string;
  character_id: string;
  status: string;
  rule_overrides_json: string;
  created_at: string;
  updated_at: string;
};

type CharacterListRow = CharacterRow & { game_id: string | null };

function parseRuleOverridesJson(value: string | null): Record<string, number> {
  if (!value) {
    return {};
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const source =
      typeof parsed.checkDcOverrides === 'object' && parsed.checkDcOverrides !== null
        ? (parsed.checkDcOverrides as Record<string, unknown>)
        : parsed;
    const result: Record<string, number> = {};
    for (const [key, entry] of Object.entries(source)) {
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        result[key] = entry;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function mapDmProfileRow(row: DmProfileRow): DmProfile {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    analysisGuide: row.analysis_guide,
    narrationGuide: row.narration_guide,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDmProfileSummaryRow(row: DmProfileSummaryRow): DmProfileSummary {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    isDefault: Boolean(row.is_default),
  };
}

function isDmGuidePhase(value: string): value is DmGuidePhase {
  return value === 'analysis' || value === 'narration';
}

function mapDmProfileRuleRow(row: DmProfileRuleRow): DmProfileRule {
  const parsedOrder = typeof row.order_num === 'number' ? row.order_num : Number(row.order_num);
  const order = Number.isFinite(parsedOrder) ? parsedOrder : 0;
  return {
    id: row.id,
    dmProfileId: row.dm_profile_id,
    phase: isDmGuidePhase(row.phase) ? row.phase : 'narration',
    category: row.category ?? '',
    title: row.title,
    content: row.content,
    order,
    isEnabled: Boolean(row.is_enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildGuideText(base: string, rules: DmProfileRule[], phase: DmGuidePhase): string {
  const lines: string[] = [];
  const trimmedBase = base.trim();
  if (trimmedBase) {
    lines.push(trimmedBase);
  }
  const filtered = rules.filter((rule) => rule.phase === phase && rule.isEnabled).sort((a, b) => a.order - b.order);
  if (filtered.length === 0) {
    return lines.join('\n');
  }
  lines.push('补充原则：');
  filtered.forEach((rule, index) => {
    const category = rule.category.trim();
    const label = category ? `【${category}】${rule.title}` : rule.title;
    lines.push(`${index + 1}) ${label}：${rule.content}`);
  });
  return lines.join('\n');
}

type CreateGameMessagePayload = {
  gameId: string;
  role: ChatRole;
  speaker: string;
  content: string;
  modules: ChatModule[];
};

function parseSkillValues(value: string): Record<string, number> {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const result: Record<string, number> = {};
    for (const [key, entry] of Object.entries(parsed)) {
      if (typeof entry === 'number' && Number.isFinite(entry)) {
        result[key] = entry;
        continue;
      }
      if (typeof entry === 'boolean') {
        result[key] = entry ? DEFAULT_TRAINED_SKILL_VALUE : DEFAULT_UNTRAINED_SKILL_VALUE;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function parseModulesJson(value: string | null): ChatModule[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as ChatModule[]) : [];
  } catch {
    return [];
  }
}

function mapGameMessageRow(row: GameMessageRow): GameMessageRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    role: row.role as ChatRole,
    speaker: row.speaker,
    content: row.content,
    modules: parseModulesJson(row.modules_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGameMemoryRow(row: GameMemoryRow): GameMemoryRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    lastRoundIndex: typeof row.last_round_index === 'number' ? row.last_round_index : Number(row.last_round_index ?? 0),
    lastProcessedAt: row.last_processed_at ?? '',
    shortSummary: row.short_summary ?? '',
    longSummary: row.long_summary ?? '',
    recentRounds: parseRoundSummaries(row.recent_rounds_json ?? '[]') as GameMemoryRoundSummary[],
    state: parseMemoryState(row.state_json ?? '{}') as GameMemoryState,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGameMemoryMapRow(row: GameMemoryMapRow): GameMemoryMapRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    roundIndex: typeof row.round_index === 'number' ? row.round_index : Number(row.round_index ?? 0),
    content: row.content ?? '',
    createdAt: row.created_at,
  };
}

function mapCharacterRow(row: CharacterRow): CharacterRecord {
  return {
    id: row.id,
    scriptId: row.script_id,
    name: row.name,
    occupation: row.occupation,
    age: row.age,
    origin: row.origin,
    appearance: row.appearance,
    background: row.background,
    motivation: row.motivation,
    avatar: row.avatar ?? '',
    luck: typeof row.luck === 'number' ? row.luck : Number(row.luck ?? 0),
    attributes: JSON.parse(row.attributes_json) as Record<AttributeKey, number>,
    skills: parseSkillValues(row.skills_json),
    inventory: JSON.parse(row.inventory_json) as string[],
    buffs: JSON.parse(row.buffs_json) as string[],
    debuffs: JSON.parse(row.debuffs_json) as string[],
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listScripts(db: D1Database): Promise<ScriptDefinition[]> {
  const result = await db.prepare(`SELECT ${SCRIPT_COLUMNS} FROM scripts ORDER BY created_at DESC`).all();
  return result.results.map((row) => mapScriptRow(row as ScriptRow));
}

export async function getScriptById(db: D1Database, scriptId: string): Promise<ScriptDefinition | null> {
  const result = await db
    .prepare(`SELECT ${SCRIPT_COLUMNS} FROM scripts WHERE id = ? LIMIT 1`)
    .bind(scriptId)
    .first<ScriptRow>();
  return result ? mapScriptRow(result) : null;
}

const SCRIPT_WRITE_COLUMNS = [
  'title',
  'summary',
  'setting',
  'difficulty',
  'opening_messages_json',
  'background_json',
  'story_arcs_json',
  'enemy_profiles_json',
  'skill_options_json',
  'equipment_options_json',
  'occupation_options_json',
  'origin_options_json',
  'buff_options_json',
  'debuff_options_json',
  'attribute_ranges_json',
  'attribute_point_budget',
  'skill_limit',
  'equipment_limit',
  'buff_limit',
  'debuff_limit',
  'rules_json',
  'scenes_json',
  'encounters_json',
] as const;

export async function createScript(db: D1Database, script: ScriptDefinition): Promise<ScriptDefinition> {
  const payload = serializeScriptDefinition(script);
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO scripts (
        id,
        ${SCRIPT_WRITE_COLUMNS.join(', ')},
        created_at,
        updated_at
      ) VALUES (
        ?,
        ${SCRIPT_WRITE_COLUMNS.map(() => '?').join(', ')},
        ?,
        ?
      )`,
    )
    .bind(payload.id, ...SCRIPT_WRITE_COLUMNS.map((column) => payload[column]), now, now)
    .run();
  return script;
}

export async function updateScript(
  db: D1Database,
  scriptId: string,
  script: ScriptDefinition,
): Promise<ScriptDefinition | null> {
  if (!scriptId) {
    return null;
  }
  const existing = await getScriptById(db, scriptId);
  if (!existing) {
    return null;
  }
  const payload = serializeScriptDefinition(script);
  const now = new Date().toISOString();
  const setters = SCRIPT_WRITE_COLUMNS.map((column) => `${column} = ?`).join(', ');
  await db
    .prepare(`UPDATE scripts SET ${setters}, updated_at = ? WHERE id = ?`)
    .bind(...SCRIPT_WRITE_COLUMNS.map((column) => payload[column]), now, scriptId)
    .run();
  return {
    ...script,
    id: scriptId,
  };
}

export async function deleteScript(db: D1Database, scriptId: string): Promise<boolean> {
  if (!scriptId) {
    return false;
  }
  const result = await db.prepare('DELETE FROM scripts WHERE id = ?').bind(scriptId).run();
  return result.success;
}

export async function listGames(db: D1Database): Promise<GameRecordSummary[]> {
  const result = await db
    .prepare(
      `SELECT ${GAME_SUMMARY_COLUMNS}
		 FROM games g
		 JOIN scripts s ON s.id = g.script_id
		 JOIN characters c ON c.id = g.character_id
		 ORDER BY g.updated_at DESC`,
    )
    .all();
  return result.results.map((row) => {
    const data = row as GameSummaryRow;
    return {
      id: data.id,
      scriptId: data.script_id,
      scriptTitle: data.script_title,
      characterId: data.character_id,
      characterName: data.character_name,
      status: data.status,
      updatedAt: data.updated_at,
    };
  });
}

export async function listGamesByUser(db: D1Database, userId: string): Promise<GameRecordSummary[]> {
  const result = await db
    .prepare(
      `SELECT ${GAME_SUMMARY_COLUMNS}
		 FROM games g
		 JOIN scripts s ON s.id = g.script_id
		 JOIN characters c ON c.id = g.character_id
		 WHERE g.user_id = ?
		 ORDER BY g.updated_at DESC`,
    )
    .bind(userId)
    .all();
  return result.results.map((row) => {
    const data = row as GameSummaryRow;
    return {
      id: data.id,
      scriptId: data.script_id,
      scriptTitle: data.script_title,
      characterId: data.character_id,
      characterName: data.character_name,
      status: data.status,
      updatedAt: data.updated_at,
    };
  });
}

export async function createCharacter(
  db: D1Database,
  userId: string,
  payload: CharacterPayload,
): Promise<CharacterRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const data = serializeCharacterPayload(payload);

  await db
    .prepare(
      `INSERT INTO characters (
				id, user_id, script_id, name, occupation, age, origin, appearance, background, motivation, avatar, luck,
				attributes_json, skills_json, inventory_json, buffs_json, debuffs_json, note,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      userId,
      payload.scriptId,
      data.name,
      data.occupation,
      data.age,
      data.origin,
      data.appearance,
      data.background,
      data.motivation,
      data.avatar,
      data.luck,
      data.attributes_json,
      data.skills_json,
      data.inventory_json,
      data.buffs_json,
      data.debuffs_json,
      data.note,
      now,
      now,
    )
    .run();

  return {
    id,
    ...payload,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getCharacterById(db: D1Database, characterId: string): Promise<CharacterRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, name, occupation, age, origin, appearance, background, motivation, avatar, luck,
			attributes_json, skills_json, inventory_json, buffs_json, debuffs_json, note,
			created_at, updated_at
			FROM characters WHERE id = ? LIMIT 1`,
    )
    .bind(characterId)
    .first<CharacterRow>();
  if (!row) {
    return null;
  }

  return mapCharacterRow(row);
}

export async function getCharacterByIdForUser(
  db: D1Database,
  characterId: string,
  userId: string,
): Promise<CharacterRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, name, occupation, age, origin, appearance, background, motivation, avatar, luck,
			attributes_json, skills_json, inventory_json, buffs_json, debuffs_json, note,
			created_at, updated_at
			FROM characters WHERE id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(characterId, userId)
    .first<CharacterRow>();
  if (!row) {
    return null;
  }
  return mapCharacterRow(row);
}

export async function updateCharacter(
  db: D1Database,
  characterId: string,
  userId: string,
  payload: CharacterPayload,
): Promise<CharacterRecord | null> {
  const now = new Date().toISOString();
  const data = serializeCharacterPayload(payload);

  await db
    .prepare(
      `UPDATE characters SET
				name = ?, occupation = ?, age = ?, origin = ?, appearance = ?, background = ?, motivation = ?, avatar = ?, luck = ?,
				attributes_json = ?, skills_json = ?, inventory_json = ?, buffs_json = ?, debuffs_json = ?, note = ?, updated_at = ?
			 WHERE id = ? AND user_id = ?`,
    )
    .bind(
      data.name,
      data.occupation,
      data.age,
      data.origin,
      data.appearance,
      data.background,
      data.motivation,
      data.avatar,
      data.luck,
      data.attributes_json,
      data.skills_json,
      data.inventory_json,
      data.buffs_json,
      data.debuffs_json,
      data.note,
      now,
      characterId,
      userId,
    )
    .run();

  return getCharacterByIdForUser(db, characterId, userId);
}

export async function updateCharacterState(
  db: D1Database,
  characterId: string,
  payload: { inventory: string[]; buffs: string[]; debuffs: string[] },
): Promise<CharacterRecord | null> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE characters
       SET inventory_json = ?, buffs_json = ?, debuffs_json = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(
      JSON.stringify(payload.inventory),
      JSON.stringify(payload.buffs),
      JSON.stringify(payload.debuffs),
      now,
      characterId,
    )
    .run();
  return getCharacterById(db, characterId);
}

export async function deleteCharacter(db: D1Database, characterId: string, userId: string): Promise<void> {
  await db.prepare(`DELETE FROM characters WHERE id = ? AND user_id = ?`).bind(characterId, userId).run();
}

export async function listCharactersByUserAndScript(
  db: D1Database,
  userId: string,
  scriptId: string,
): Promise<Array<CharacterRecord & { isUsed: boolean; gameId: string | null }>> {
  const result = await db
    .prepare(
      `SELECT c.id, c.script_id, c.name, c.occupation, c.age, c.origin, c.appearance, c.background, c.motivation, c.avatar, c.luck,
			c.attributes_json, c.skills_json, c.inventory_json, c.buffs_json, c.debuffs_json, c.note,
			c.created_at, c.updated_at, g.id as game_id
		 FROM characters c
		 LEFT JOIN games g ON g.character_id = c.id
		 WHERE c.user_id = ? AND c.script_id = ?
		 ORDER BY c.created_at DESC`,
    )
    .bind(userId, scriptId)
    .all();
  return result.results.map((row) => {
    const record = mapCharacterRow(row as CharacterRow);
    const gameId = (row as CharacterListRow).game_id;
    return { ...record, isUsed: Boolean(gameId), gameId: gameId ?? null };
  });
}

export async function getGameByCharacterId(db: D1Database, characterId: string): Promise<GameRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, character_id, status, rule_overrides_json, created_at, updated_at
		 FROM games WHERE character_id = ? LIMIT 1`,
    )
    .bind(characterId)
    .first<GameRow>();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    scriptId: row.script_id,
    characterId: row.character_id,
    status: row.status,
    ruleOverrides: { checkDcOverrides: parseRuleOverridesJson(row.rule_overrides_json) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGameByIdForUser(db: D1Database, gameId: string, userId: string): Promise<GameRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, character_id, status, rule_overrides_json, created_at, updated_at
		 FROM games WHERE id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(gameId, userId)
    .first<GameRow>();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    scriptId: row.script_id,
    characterId: row.character_id,
    status: row.status,
    ruleOverrides: { checkDcOverrides: parseRuleOverridesJson(row.rule_overrides_json) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGameById(db: D1Database, gameId: string): Promise<(GameRecord & { userId: string }) | null> {
  const row = await db
    .prepare(
      `SELECT id, user_id, script_id, character_id, status, rule_overrides_json, created_at, updated_at
       FROM games WHERE id = ? LIMIT 1`,
    )
    .bind(gameId)
    .first<GameRow & { user_id: string }>();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    scriptId: row.script_id,
    characterId: row.character_id,
    status: row.status,
    ruleOverrides: { checkDcOverrides: parseRuleOverridesJson(row.rule_overrides_json) },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  };
}

export async function createGame(db: D1Database, userId: string, payload: CreateGamePayload): Promise<GameRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO games (id, user_id, script_id, character_id, status, rule_overrides_json, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, payload.scriptId, payload.characterId, 'active', '{"checkDcOverrides":{}}', now, now)
    .run();

  return {
    id,
    scriptId: payload.scriptId,
    characterId: payload.characterId,
    status: 'active',
    ruleOverrides: { checkDcOverrides: {} },
    createdAt: now,
    updatedAt: now,
  };
}

export async function deleteGame(db: D1Database, gameId: string, userId: string): Promise<void> {
  await db.prepare(`DELETE FROM games WHERE id = ? AND user_id = ?`).bind(gameId, userId).run();
}

export async function updateGameRuleOverrides(
  db: D1Database,
  gameId: string,
  overrides: Record<string, number>,
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE games SET rule_overrides_json = ?, updated_at = ? WHERE id = ?`)
    .bind(JSON.stringify({ checkDcOverrides: overrides }), now, gameId)
    .run();
}

export async function listGameMessages(db: D1Database, gameId: string, limit = 120): Promise<GameMessageRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, game_id, role, speaker, content, modules_json, created_at, updated_at
       FROM game_messages
       WHERE game_id = ?
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(gameId, limit)
    .all();
  return result.results.map((row) => mapGameMessageRow(row as GameMessageRow));
}

export async function listGameMessagesAfter(
  db: D1Database,
  gameId: string,
  after: string,
  limit = 240,
): Promise<GameMessageRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, game_id, role, speaker, content, modules_json, created_at, updated_at
       FROM game_messages
       WHERE game_id = ? AND created_at > ?
       ORDER BY created_at ASC
       LIMIT ?`,
    )
    .bind(gameId, after, limit)
    .all();
  return result.results.map((row) => mapGameMessageRow(row as GameMessageRow));
}

export async function getGameMemory(db: D1Database, gameId: string): Promise<GameMemoryRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, game_id, last_round_index, last_processed_at, short_summary, long_summary, recent_rounds_json, state_json,
       created_at, updated_at
       FROM game_memories WHERE game_id = ? LIMIT 1`,
    )
    .bind(gameId)
    .first<GameMemoryRow>();
  return row ? mapGameMemoryRow(row) : null;
}

export async function listGameMemoryMaps(db: D1Database, gameId: string, limit = 20): Promise<GameMemoryMapRecord[]> {
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 50) : 20;
  const result = await db
    .prepare(
      'SELECT id, game_id, round_index, content, created_at FROM game_memory_maps WHERE game_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .bind(gameId, normalizedLimit)
    .all();
  return result.results.map((row) => mapGameMemoryMapRow(row as GameMemoryMapRow));
}

export async function createGameMemoryMap(
  db: D1Database,
  payload: Pick<GameMemoryMapRecord, 'id' | 'gameId' | 'roundIndex' | 'content' | 'createdAt'>,
): Promise<GameMemoryMapRecord> {
  const row = await db
    .prepare(
      'INSERT INTO game_memory_maps (id, game_id, round_index, content, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id, game_id, round_index, content, created_at',
    )
    .bind(payload.id, payload.gameId, payload.roundIndex, payload.content, payload.createdAt)
    .first<GameMemoryMapRow>();
  if (!row) {
    return {
      id: payload.id,
      gameId: payload.gameId,
      roundIndex: payload.roundIndex,
      content: payload.content,
      createdAt: payload.createdAt,
    };
  }
  return mapGameMemoryMapRow(row);
}

export async function upsertGameMemory(db: D1Database, payload: GameMemoryRecord): Promise<GameMemoryRecord> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO game_memories (
        id, game_id, last_round_index, last_processed_at, short_summary, long_summary, recent_rounds_json, state_json,
        created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(game_id) DO UPDATE SET
        last_round_index = excluded.last_round_index,
        last_processed_at = excluded.last_processed_at,
        short_summary = excluded.short_summary,
        long_summary = excluded.long_summary,
        recent_rounds_json = excluded.recent_rounds_json,
        state_json = excluded.state_json,
        updated_at = excluded.updated_at`,
    )
    .bind(
      payload.id,
      payload.gameId,
      payload.lastRoundIndex,
      payload.lastProcessedAt,
      payload.shortSummary,
      payload.longSummary,
      JSON.stringify(payload.recentRounds ?? []),
      JSON.stringify(payload.state ?? {}),
      payload.createdAt ?? now,
      payload.updatedAt ?? now,
    )
    .run();
  const row = await db
    .prepare(
      `SELECT id, game_id, last_round_index, last_processed_at, short_summary, long_summary, recent_rounds_json, state_json,
       created_at, updated_at
       FROM game_memories WHERE game_id = ? LIMIT 1`,
    )
    .bind(payload.gameId)
    .first<GameMemoryRow>();
  if (!row) {
    return { ...payload, updatedAt: now, createdAt: payload.createdAt ?? now };
  }
  return mapGameMemoryRow(row);
}

export async function createGameMessage(db: D1Database, payload: CreateGameMessagePayload): Promise<GameMessageRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const modulesJson = JSON.stringify(payload.modules ?? []);
  await db
    .prepare(
      `INSERT INTO game_messages (id, game_id, role, speaker, content, modules_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, payload.gameId, payload.role, payload.speaker, payload.content, modulesJson, now, now)
    .run();
  return {
    id,
    gameId: payload.gameId,
    role: payload.role,
    speaker: payload.speaker,
    content: payload.content,
    modules: payload.modules ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function createGameMessages(
  db: D1Database,
  payloads: CreateGameMessagePayload[],
): Promise<GameMessageRecord[]> {
  if (payloads.length === 0) {
    return [];
  }
  const now = new Date().toISOString();
  const records = payloads.map((payload) => ({
    id: crypto.randomUUID(),
    gameId: payload.gameId,
    role: payload.role,
    speaker: payload.speaker,
    content: payload.content,
    modules: payload.modules ?? [],
    createdAt: now,
    updatedAt: now,
  }));

  const statements = records.map((record) =>
    db
      .prepare(
        `INSERT INTO game_messages (id, game_id, role, speaker, content, modules_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        record.id,
        record.gameId,
        record.role,
        record.speaker,
        record.content,
        JSON.stringify(record.modules ?? []),
        record.createdAt,
        record.updatedAt,
      ),
  );
  await db.batch(statements);
  return records;
}

function parseProvider(value: string | null): UserSettings['provider'] {
  return value === 'gemini' ? 'gemini' : 'openai';
}

export async function getUserSettings(db: D1Database, userId: string): Promise<UserSettings | null> {
  const row = await db
    .prepare(
      'SELECT ai_provider, ai_fast_model, ai_general_model, dm_profile_id FROM user_settings WHERE user_id = ? LIMIT 1',
    )
    .bind(userId)
    .first<UserSettingsRow>();
  if (!row) {
    return null;
  }
  const provider = parseProvider(row.ai_provider);
  return {
    provider,
    fastModel: normalizeModel(provider, 'fast', row.ai_fast_model ?? ''),
    generalModel: normalizeModel(provider, 'general', row.ai_general_model ?? ''),
    dmProfileId: row.dm_profile_id ?? null,
  };
}

export async function upsertUserSettings(
  db: D1Database,
  userId: string,
  settings: UserSettings,
): Promise<UserSettings> {
  const now = new Date().toISOString();
  const provider = settings.provider;
  const fastModel = normalizeModel(provider, 'fast', settings.fastModel);
  const generalModel = normalizeModel(provider, 'general', settings.generalModel);
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, ai_provider, ai_fast_model, ai_general_model, dm_profile_id, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT(user_id) DO UPDATE SET ai_provider = excluded.ai_provider, ai_fast_model = excluded.ai_fast_model, ai_general_model = excluded.ai_general_model, dm_profile_id = excluded.dm_profile_id, updated_at = excluded.updated_at`,
    )
    .bind(userId, provider, fastModel, generalModel, settings.dmProfileId ?? null, now, now)
    .run();
  return {
    provider,
    fastModel,
    generalModel,
    dmProfileId: settings.dmProfileId ?? null,
  };
}

export async function listDmProfiles(db: D1Database): Promise<DmProfileSummary[]> {
  const rows = await db
    .prepare('SELECT id, name, summary, is_default FROM dm_profiles ORDER BY is_default DESC, name ASC')
    .all<DmProfileSummaryRow>();
  return (rows.results ?? []).map(mapDmProfileSummaryRow);
}

export async function getDmProfileById(db: D1Database, id: string): Promise<DmProfile | null> {
  if (!id) {
    return null;
  }
  const row = await db
    .prepare(
      'SELECT id, name, summary, analysis_guide, narration_guide, is_default, created_at, updated_at FROM dm_profiles WHERE id = ? LIMIT 1',
    )
    .bind(id)
    .first<DmProfileRow>();
  return row ? mapDmProfileRow(row) : null;
}

export async function getDmProfileWithRules(db: D1Database, id: string): Promise<DmProfileDetail | null> {
  const profile = await getDmProfileById(db, id);
  if (!profile) {
    return null;
  }
  const rules = await listDmProfileRules(db, id);
  return {
    ...profile,
    rules,
  };
}

export async function getDefaultDmProfile(db: D1Database): Promise<DmProfile | null> {
  const row = await db
    .prepare(
      'SELECT id, name, summary, analysis_guide, narration_guide, is_default, created_at, updated_at FROM dm_profiles WHERE is_default = 1 LIMIT 1',
    )
    .first<DmProfileRow>();
  return row ? mapDmProfileRow(row) : null;
}

export async function getActiveDmProfile(db: D1Database, dmProfileId?: string | null): Promise<DmProfile | null> {
  if (dmProfileId) {
    const profile = await getDmProfileWithRules(db, dmProfileId);
    if (profile) {
      return {
        ...profile,
        analysisGuide: buildGuideText(profile.analysisGuide, profile.rules, 'analysis'),
        narrationGuide: buildGuideText(profile.narrationGuide, profile.rules, 'narration'),
      };
    }
  }
  const fallback = await getDefaultDmProfile(db);
  if (!fallback) {
    return null;
  }
  const rules = await listDmProfileRules(db, fallback.id);
  return {
    ...fallback,
    analysisGuide: buildGuideText(fallback.analysisGuide, rules, 'analysis'),
    narrationGuide: buildGuideText(fallback.narrationGuide, rules, 'narration'),
  };
}

export async function listDmProfileRules(db: D1Database, dmProfileId: string): Promise<DmProfileRule[]> {
  if (!dmProfileId) {
    return [];
  }
  const rows = await db
    .prepare(
      'SELECT id, dm_profile_id, phase, category, title, content, order_num, is_enabled, created_at, updated_at FROM dm_profile_rules WHERE dm_profile_id = ? ORDER BY order_num ASC',
    )
    .bind(dmProfileId)
    .all<DmProfileRuleRow>();
  return (rows.results ?? []).map(mapDmProfileRuleRow);
}

export async function createDmProfile(
  db: D1Database,
  payload: {
    name: string;
    summary: string;
    analysisGuide?: string;
    narrationGuide?: string;
    isDefault?: boolean;
  },
): Promise<DmProfile> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const isDefault = payload.isDefault ? 1 : 0;
  if (isDefault) {
    await db.prepare('UPDATE dm_profiles SET is_default = 0').run();
  }
  await db
    .prepare(
      `INSERT INTO dm_profiles (id, name, summary, analysis_guide, narration_guide, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      payload.name,
      payload.summary,
      payload.analysisGuide ?? '',
      payload.narrationGuide ?? '',
      isDefault,
      now,
      now,
    )
    .run();
  return {
    id,
    name: payload.name,
    summary: payload.summary,
    analysisGuide: payload.analysisGuide ?? '',
    narrationGuide: payload.narrationGuide ?? '',
    isDefault: Boolean(isDefault),
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateDmProfile(
  db: D1Database,
  id: string,
  payload: {
    name?: string;
    summary?: string;
    analysisGuide?: string;
    narrationGuide?: string;
    isDefault?: boolean;
  },
): Promise<DmProfile | null> {
  if (!id) {
    return null;
  }
  const existing = await getDmProfileById(db, id);
  if (!existing) {
    return null;
  }
  const now = new Date().toISOString();
  const name = payload.name ?? existing.name;
  const summary = payload.summary ?? existing.summary;
  const analysisGuide = payload.analysisGuide ?? existing.analysisGuide;
  const narrationGuide = payload.narrationGuide ?? existing.narrationGuide;
  const isDefault = typeof payload.isDefault === 'boolean' ? (payload.isDefault ? 1 : 0) : existing.isDefault ? 1 : 0;
  if (payload.isDefault === true) {
    await db.prepare('UPDATE dm_profiles SET is_default = 0').run();
  }
  await db
    .prepare(
      `UPDATE dm_profiles
       SET name = ?, summary = ?, analysis_guide = ?, narration_guide = ?, is_default = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(name, summary, analysisGuide, narrationGuide, isDefault, now, id)
    .run();
  return {
    ...existing,
    name,
    summary,
    analysisGuide,
    narrationGuide,
    isDefault: Boolean(isDefault),
    updatedAt: now,
  };
}

export async function deleteDmProfile(db: D1Database, id: string): Promise<boolean> {
  if (!id) {
    return false;
  }
  const result = await db.prepare('DELETE FROM dm_profiles WHERE id = ?').bind(id).run();
  return result.success;
}

export async function createDmProfileRule(
  db: D1Database,
  payload: {
    dmProfileId: string;
    phase: DmGuidePhase;
    category?: string;
    title: string;
    content: string;
    order?: number;
    isEnabled?: boolean;
  },
): Promise<DmProfileRule> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const order = typeof payload.order === 'number' ? payload.order : 0;
  const isEnabled = payload.isEnabled === false ? 0 : 1;
  await db
    .prepare(
      `INSERT INTO dm_profile_rules (id, dm_profile_id, phase, category, title, content, order_num, is_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      payload.dmProfileId,
      payload.phase,
      payload.category ?? '',
      payload.title,
      payload.content,
      order,
      isEnabled,
      now,
      now,
    )
    .run();
  return {
    id,
    dmProfileId: payload.dmProfileId,
    phase: payload.phase,
    category: payload.category ?? '',
    title: payload.title,
    content: payload.content,
    order,
    isEnabled: Boolean(isEnabled),
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateDmProfileRule(
  db: D1Database,
  id: string,
  payload: {
    phase?: DmGuidePhase;
    category?: string;
    title?: string;
    content?: string;
    order?: number;
    isEnabled?: boolean;
  },
): Promise<DmProfileRule | null> {
  if (!id) {
    return null;
  }
  const row = await db
    .prepare(
      'SELECT id, dm_profile_id, phase, category, title, content, order_num, is_enabled, created_at, updated_at FROM dm_profile_rules WHERE id = ? LIMIT 1',
    )
    .bind(id)
    .first<DmProfileRuleRow>();
  if (!row) {
    return null;
  }
  const current = mapDmProfileRuleRow(row);
  const now = new Date().toISOString();
  const phase = payload.phase ?? current.phase;
  const category = payload.category ?? current.category;
  const title = payload.title ?? current.title;
  const content = payload.content ?? current.content;
  const order = typeof payload.order === 'number' ? payload.order : current.order;
  const isEnabled = typeof payload.isEnabled === 'boolean' ? payload.isEnabled : current.isEnabled;
  await db
    .prepare(
      `UPDATE dm_profile_rules
       SET phase = ?, category = ?, title = ?, content = ?, order_num = ?, is_enabled = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(phase, category, title, content, order, isEnabled ? 1 : 0, now, id)
    .run();
  return {
    ...current,
    phase,
    category,
    title,
    content,
    order,
    isEnabled,
    updatedAt: now,
  };
}

export async function deleteDmProfileRule(db: D1Database, id: string): Promise<boolean> {
  if (!id) {
    return false;
  }
  const result = await db.prepare('DELETE FROM dm_profile_rules WHERE id = ?').bind(id).run();
  return result.success;
}

export async function getUserRole(db: D1Database, userId: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT role FROM user_roles WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first<UserRoleRow>();
  return row?.role ?? null;
}
