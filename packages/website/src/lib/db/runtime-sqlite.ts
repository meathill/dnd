type SqliteParameter = string | number | bigint | Uint8Array | null;

type SqliteRunResult = {
  changes: number | bigint;
  lastInsertRowid: number | bigint;
};

type SqliteStatement = {
  readonly reader: boolean;
  all(...parameters: SqliteParameter[]): unknown[];
  run(...parameters: SqliteParameter[]): SqliteRunResult;
};

type SqliteDatabase = {
  close(): void;
  prepare(sql: string): SqliteStatement;
  exec(sql: string): void;
};

type NodeSqliteStatementSync = import('node:sqlite').StatementSync;
type NodeSqliteDatabaseSync = import('node:sqlite').DatabaseSync;

export type SqlStatementResult<T> = {
  rows: T[];
  changes: number;
  lastInsertRowid: number;
};

export type SqlExecutor = {
  execute<T>(sql: string, parameters?: ReadonlyArray<unknown>): Promise<SqlStatementResult<T>>;
  batch<T>(
    statements: ReadonlyArray<{ sql: string; parameters?: ReadonlyArray<unknown> }>,
  ): Promise<SqlStatementResult<T>[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
};

function normalizeRunResult(result: SqliteRunResult): Pick<SqlStatementResult<never>, 'changes' | 'lastInsertRowid'> {
  return {
    changes: Number(result.changes),
    lastInsertRowid: Number(result.lastInsertRowid),
  };
}

export class NodeSqliteExecutor implements SqlExecutor {
  constructor(private readonly database: SqliteDatabase) {}

  async execute<T>(sql: string, parameters: ReadonlyArray<unknown> = []): Promise<SqlStatementResult<T>> {
    const statement = this.database.prepare(sql);
    if (statement.reader) {
      return {
        rows: statement.all(...(parameters as SqliteParameter[])) as T[],
        changes: 0,
        lastInsertRowid: 0,
      };
    }
    const result = statement.run(...(parameters as SqliteParameter[]));
    return {
      rows: [],
      ...normalizeRunResult(result),
    };
  }

  async batch<T>(
    statements: ReadonlyArray<{ sql: string; parameters?: ReadonlyArray<unknown> }>,
  ): Promise<SqlStatementResult<T>[]> {
    if (statements.length === 0) {
      return [];
    }
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map((item) => {
        const statement = this.database.prepare(item.sql);
        const parameters = (item.parameters ?? []) as SqliteParameter[];
        if (statement.reader) {
          return {
            rows: statement.all(...parameters) as T[],
            changes: 0,
            lastInsertRowid: 0,
          };
        }
        const result = statement.run(...parameters);
        return {
          rows: [],
          ...normalizeRunResult(result),
        };
      });
      this.database.exec('COMMIT');
      return results;
    } catch (error) {
      try {
        this.database.exec('ROLLBACK');
      } catch {
        // noop
      }
      throw error;
    }
  }

  async exec(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async close(): Promise<void> {
    this.database.close();
  }
}

class NodeSqliteStatementAdapter implements SqliteStatement {
  readonly reader: boolean;

  constructor(private readonly statement: NodeSqliteStatementSync) {
    this.reader = this.statement.columns().length > 0;
  }

  all(...parameters: SqliteParameter[]): unknown[] {
    return this.statement.all(...parameters);
  }

  run(...parameters: SqliteParameter[]): SqliteRunResult {
    return this.statement.run(...parameters);
  }
}

class NodeSqliteDatabaseAdapter implements SqliteDatabase {
  constructor(private readonly database: NodeSqliteDatabaseSync) {}

  close(): void {
    this.database.close();
  }

  prepare(sql: string): SqliteStatement {
    return new NodeSqliteStatementAdapter(this.database.prepare(sql));
  }

  exec(sql: string): void {
    this.database.exec(sql);
  }
}

export async function createNodeSqliteExecutor(filePath: string): Promise<NodeSqliteExecutor> {
  const { DatabaseSync } = await import('node:sqlite');
  return new NodeSqliteExecutor(new NodeSqliteDatabaseAdapter(new DatabaseSync(filePath)));
}
