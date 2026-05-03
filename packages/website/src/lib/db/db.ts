import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createNodeSqliteDatabase } from './node-sqlite';

const DEFAULT_DB_PATH = resolve(process.cwd(), '.local', 'website.sqlite');
let databaseSingleton: ReturnType<typeof createDatabase> | null = null;
let databaseSingletonPath = '';

function resolveDatabasePath(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_DB_PATH;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createDatabase(filePath: string) {
  const sqlite = createNodeSqliteDatabase(filePath);
  return { sqlite };
}

async function applyMigrations(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const sqlite = createNodeSqliteDatabase(filePath);
  const migrationFilePath = join(process.cwd(), 'migrations', '0001_init.sql');
  const migrationSql = await readFile(migrationFilePath, 'utf8');
  const existing = sqlite.all(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'modules'
  `);
  if (existing.length === 0) {
    sqlite.exec(migrationSql);
  }
  sqlite.close();
}

export async function getDatabase() {
  const filePath = resolveDatabasePath();
  if (databaseSingleton && databaseSingletonPath === filePath) {
    return databaseSingleton;
  }
  if (databaseSingleton) {
    databaseSingleton.sqlite.close();
  }
  await applyMigrations(filePath);
  databaseSingleton = createDatabase(filePath);
  databaseSingletonPath = filePath;
  return databaseSingleton;
}

export function buildTimestamp() {
  return nowIso();
}
