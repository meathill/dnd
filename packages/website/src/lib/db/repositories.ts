import type { AttributeKey, ScriptDefinition, CharacterRecord, GameRecord, GameRecordSummary } from '../game/types';
import type { CharacterPayload, CreateGamePayload } from '../game/validators';
import { mapScriptRow, serializeCharacterPayload } from './mappers';
import type { UserSettings } from '../session/session-types';

const SCRIPT_COLUMNS =
  'id, title, summary, setting, difficulty, skill_options_json, equipment_options_json, occupation_options_json, origin_options_json, buff_options_json, debuff_options_json, attribute_ranges_json, attribute_point_budget, skill_limit, equipment_limit, buff_limit, debuff_limit, scenes_json, encounters_json';
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
  ai_model: string;
};

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
    attributes: JSON.parse(row.attributes_json) as Record<AttributeKey, number>,
    skills: JSON.parse(row.skills_json) as Record<string, boolean>,
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
  return result.results.map((row) => mapScriptRow(row as Record<string, string>));
}

export async function getScriptById(db: D1Database, scriptId: string): Promise<ScriptDefinition | null> {
  const result = await db
    .prepare(`SELECT ${SCRIPT_COLUMNS} FROM scripts WHERE id = ? LIMIT 1`)
    .bind(scriptId)
    .first<Record<string, string>>();
  return result ? mapScriptRow(result) : null;
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
				id, user_id, script_id, name, occupation, age, origin, appearance, background, motivation,
				attributes_json, skills_json, inventory_json, buffs_json, debuffs_json, note,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    scriptId: payload.scriptId,
    ...payload,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getCharacterById(db: D1Database, characterId: string): Promise<CharacterRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, name, occupation, age, origin, appearance, background, motivation,
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
      `SELECT id, script_id, name, occupation, age, origin, appearance, background, motivation,
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

export async function getGameByCharacterId(db: D1Database, characterId: string): Promise<GameRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, character_id, status, created_at, updated_at
		 FROM games WHERE character_id = ? LIMIT 1`,
    )
    .bind(characterId)
    .first<Record<string, string>>();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    scriptId: row.script_id,
    characterId: row.character_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getGameByIdForUser(db: D1Database, gameId: string, userId: string): Promise<GameRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, script_id, character_id, status, created_at, updated_at
		 FROM games WHERE id = ? AND user_id = ? LIMIT 1`,
    )
    .bind(gameId, userId)
    .first<Record<string, string>>();
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    scriptId: row.script_id,
    characterId: row.character_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createGame(db: D1Database, userId: string, payload: CreateGamePayload): Promise<GameRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO games (id, user_id, script_id, character_id, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, payload.scriptId, payload.characterId, 'active', now, now)
    .run();

  return {
    id,
    scriptId: payload.scriptId,
    characterId: payload.characterId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function parseProvider(value: string | null): UserSettings['provider'] {
  return value === 'gemini' ? 'gemini' : 'openai';
}

export async function getUserSettings(db: D1Database, userId: string): Promise<UserSettings | null> {
  const row = await db
    .prepare('SELECT ai_provider, ai_model FROM user_settings WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first<UserSettingsRow>();
  if (!row) {
    return null;
  }
  return {
    provider: parseProvider(row.ai_provider),
    model: row.ai_model ?? '',
  };
}

export async function upsertUserSettings(
  db: D1Database,
  userId: string,
  settings: UserSettings,
): Promise<UserSettings> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, ai_provider, ai_model, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(user_id) DO UPDATE SET ai_provider = excluded.ai_provider, ai_model = excluded.ai_model, updated_at = excluded.updated_at`,
    )
    .bind(userId, settings.provider, settings.model, now, now)
    .run();
  return settings;
}
