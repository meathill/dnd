import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createNodeSqliteExecutor, type SqlExecutor, type SqlStatementResult } from './runtime-sqlite';
import { INIT_SQL } from './schema-sql';

const CLOUDFLARE_CONTEXT_SYMBOL = Symbol.for('__cloudflare-context__');

type D1Like = Pick<D1Database, 'prepare' | 'batch' | 'exec'>;

type DatabaseInstance = {
  sqlite: SqlExecutor;
  kind: 'sqlite' | 'd1';
};

let databaseSingleton: DatabaseInstance | null = null;
let databaseSingletonKey = '';

async function resolveDefaultDatabasePath(): Promise<string> {
  const { resolve } = await import('node:path');
  return resolve(process.cwd(), '.local', 'website.sqlite');
}

async function resolveDatabasePath(): Promise<string> {
  return process.env.DATABASE_URL?.trim() || (await resolveDefaultDatabasePath());
}

function nowIso(): string {
  return new Date().toISOString();
}

function hasCloudflareContext(): boolean {
  return Boolean((globalThis as Record<PropertyKey, unknown>)[CLOUDFLARE_CONTEXT_SYMBOL]);
}

function shouldUseD1(): boolean {
  return !process.env.DATABASE_URL?.trim() && hasCloudflareContext();
}

function normalizeD1Result<T>(result: D1Result<T>): SqlStatementResult<T> {
  return {
    rows: result.results,
    changes: result.meta.changes,
    lastInsertRowid: result.meta.last_row_id,
  };
}

class D1Executor implements SqlExecutor {
  constructor(private readonly database: D1Like) {}

  async execute<T>(sql: string, parameters: ReadonlyArray<unknown> = []): Promise<SqlStatementResult<T>> {
    const result = await this.database
      .prepare(sql)
      .bind(...parameters)
      .run<T>();
    return normalizeD1Result(result);
  }

  async batch<T>(
    statements: ReadonlyArray<{ sql: string; parameters?: ReadonlyArray<unknown> }>,
  ): Promise<SqlStatementResult<T>[]> {
    const prepared = statements.map((statement) =>
      this.database.prepare(statement.sql).bind(...(statement.parameters ?? [])),
    );
    const results = await this.database.batch<T>(prepared);
    return results.map((result) => normalizeD1Result(result));
  }

  async exec(sql: string): Promise<void> {
    await this.database.exec(sql);
  }

  async close(): Promise<void> {
    // D1 binding does not need explicit close.
  }
}

async function getD1Database(): Promise<D1Like> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) {
    throw new Error('Cloudflare D1 绑定 DB 未配置');
  }
  return env.DB;
}

async function applyMigrations(executor: SqlExecutor): Promise<void> {
  const existing = await executor.execute<{ name: string }>(
    `SELECT name
     FROM sqlite_master
     WHERE type = 'table' AND name = 'modules'`,
  );
  if (existing.rows.length === 0) {
    await executor.exec(INIT_SQL);
  }
}

async function createDatabase(): Promise<DatabaseInstance> {
  if (shouldUseD1()) {
    const sqlite = new D1Executor(await getD1Database());
    await applyMigrations(sqlite);
    return { sqlite, kind: 'd1' };
  }
  const filePath = resolveDatabasePath();
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  const resolvedFilePath = await filePath;
  await mkdir(dirname(resolvedFilePath), { recursive: true });
  const sqlite = await createNodeSqliteExecutor(resolvedFilePath);
  await applyMigrations(sqlite);
  return { sqlite, kind: 'sqlite' };
}

async function buildSingletonKey(): Promise<string> {
  if (shouldUseD1()) {
    return 'd1';
  }
  return `sqlite:${await resolveDatabasePath()}`;
}

export async function getDatabase(): Promise<DatabaseInstance> {
  const key = await buildSingletonKey();
  if (databaseSingleton && databaseSingletonKey === key) {
    return databaseSingleton;
  }
  if (databaseSingleton) {
    await databaseSingleton.sqlite.close();
  }
  databaseSingleton = await createDatabase();
  databaseSingletonKey = key;
  return databaseSingleton;
}

export function buildTimestamp() {
  return nowIso();
}
