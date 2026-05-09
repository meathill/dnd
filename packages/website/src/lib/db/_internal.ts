import type { getDatabase } from './db';

export type DatabaseConnection = Awaited<ReturnType<typeof getDatabase>>['sqlite'];
export type BatchStatement = { sql: string; parameters?: ReadonlyArray<unknown> };

export function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export async function queryAll<T>(
  sqlite: DatabaseConnection,
  sql: string,
  parameters: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  return (await sqlite.execute<T>(sql, parameters)).rows;
}

export async function queryFirst<T>(
  sqlite: DatabaseConnection,
  sql: string,
  parameters: ReadonlyArray<unknown> = [],
): Promise<T | null> {
  const rows = await queryAll<T>(sqlite, sql, parameters);
  return rows[0] ?? null;
}
