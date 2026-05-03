import { DatabaseSync } from 'node:sqlite';

type SqliteParameter = string | number | bigint | Uint8Array | null;

type SqliteRunResult = {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
};

type SqliteStatement = {
  readonly reader: boolean;
  all(parameters?: ReadonlyArray<unknown>): unknown[];
  run(parameters?: ReadonlyArray<unknown>): SqliteRunResult;
  iterate(parameters?: ReadonlyArray<unknown>): IterableIterator<unknown>;
};

type SqliteDatabaseLike = {
  close(): void;
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
  all<T>(sql: string, parameters?: ReadonlyArray<unknown>): T[];
  get<T>(sql: string, parameters?: ReadonlyArray<unknown>): T | null;
  run(sql: string, parameters?: ReadonlyArray<unknown>): SqliteRunResult;
};

class NodeSqliteStatementAdapter implements SqliteStatement {
  readonly reader: boolean;

  constructor(private readonly statement: ReturnType<DatabaseSync['prepare']>) {
    this.reader = this.statement.columns().length > 0;
  }

  all(parameters: ReadonlyArray<unknown> = []): unknown[] {
    return this.statement.all(...(parameters as SqliteParameter[]));
  }

  run(parameters: ReadonlyArray<unknown> = []): SqliteRunResult {
    return this.statement.run(...(parameters as SqliteParameter[]));
  }

  *iterate(parameters: ReadonlyArray<unknown> = []): IterableIterator<unknown> {
    for (const row of this.statement.iterate(...(parameters as SqliteParameter[]))) {
      yield row;
    }
  }
}

export class NodeSqliteDatabaseAdapter implements SqliteDatabaseLike {
  constructor(readonly raw: DatabaseSync) {}

  close(): void {
    this.raw.close();
  }

  exec(sql: string): void {
    this.raw.exec(sql);
  }

  all<T>(sql: string, parameters: ReadonlyArray<unknown> = []): T[] {
    return this.raw.prepare(sql).all(...(parameters as SqliteParameter[])) as T[];
  }

  get<T>(sql: string, parameters: ReadonlyArray<unknown> = []): T | null {
    const rows = this.raw.prepare(sql).all(...(parameters as SqliteParameter[])) as T[];
    return rows[0] ?? null;
  }

  run(sql: string, parameters: ReadonlyArray<unknown> = []): SqliteRunResult {
    return this.raw.prepare(sql).run(...(parameters as SqliteParameter[]));
  }

  prepare(sql: string): SqliteStatement {
    return new NodeSqliteStatementAdapter(this.raw.prepare(sql));
  }
}

export function createNodeSqliteDatabase(filePath: string): NodeSqliteDatabaseAdapter {
  return new NodeSqliteDatabaseAdapter(new DatabaseSync(filePath));
}
