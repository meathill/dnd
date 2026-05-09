import type { CharacterRecord } from '../game/types';
import { parseJson, queryAll, queryFirst } from './_internal';
import { getDatabase } from './db';

type CharacterRow = {
  id: string;
  module_id: string;
  name: string;
  summary: string;
  data_json: string;
};

function mapCharacter(row: CharacterRow): CharacterRecord {
  return {
    id: row.id,
    moduleId: row.module_id,
    name: row.name,
    summary: row.summary,
    data: parseJson<Record<string, unknown>>(row.data_json),
  };
}

export async function listCharactersByModuleId(moduleId: string): Promise<CharacterRecord[]> {
  const { sqlite } = await getDatabase();
  return (
    await queryAll<CharacterRow>(sqlite, 'SELECT * FROM characters WHERE module_id = ? ORDER BY created_at ASC', [
      moduleId,
    ])
  ).map(mapCharacter);
}

export async function getCharacterById(id: string): Promise<CharacterRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await queryFirst<CharacterRow>(sqlite, 'SELECT * FROM characters WHERE id = ?', [id]);
  return row ? mapCharacter(row) : null;
}
