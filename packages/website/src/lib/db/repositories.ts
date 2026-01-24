import type { AttributeKey, ScriptDefinition, CharacterRecord, GameRecord } from '../game/types';
import type { CharacterPayload, CreateGamePayload } from '../game/validators';
import { mapScriptRow, serializeCharacterPayload } from './mappers';

const SCRIPT_COLUMNS =
  'id, title, summary, setting, difficulty, skill_options_json, equipment_options_json, occupation_options_json, origin_options_json, buff_options_json, debuff_options_json, attribute_ranges_json, attribute_point_budget, skill_limit, equipment_limit, buff_limit, debuff_limit, scenes_json, encounters_json';

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

export async function createCharacter(db: D1Database, payload: CharacterPayload): Promise<CharacterRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const data = serializeCharacterPayload(payload);

  await db
    .prepare(
      `INSERT INTO characters (
				id, script_id, name, occupation, age, origin, appearance, background, motivation,
				attributes_json, skills_json, inventory_json, buffs_json, debuffs_json, note,
				created_at, updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
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
    .first<Record<string, string>>();
  if (!row) {
    return null;
  }

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

export async function createGame(db: D1Database, payload: CreateGamePayload): Promise<GameRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO games (id, script_id, character_id, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, payload.scriptId, payload.characterId, 'active', now, now)
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
