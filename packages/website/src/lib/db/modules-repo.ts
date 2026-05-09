import type { ModuleRecord } from '../game/types';
import { parseJson, queryAll, queryFirst } from './_internal';
import { getDatabase } from './db';

type ModuleRow = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  data_json: string;
};

function mapModule(row: ModuleRow): ModuleRecord {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    setting: row.setting,
    difficulty: row.difficulty,
    data: parseJson<Record<string, unknown>>(row.data_json),
  };
}

export async function listModules(): Promise<ModuleRecord[]> {
  const { sqlite } = await getDatabase();
  return (await queryAll<ModuleRow>(sqlite, 'SELECT * FROM modules ORDER BY created_at DESC')).map(mapModule);
}

export async function getModuleById(id: string): Promise<ModuleRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await queryFirst<ModuleRow>(sqlite, 'SELECT * FROM modules WHERE id = ?', [id]);
  return row ? mapModule(row) : null;
}
