import { randomUUID } from 'node:crypto';
import type {
  BillingLedgerRecord,
  CharacterRecord,
  GameMessageRecord,
  GameRecord,
  ModuleRecord,
  UserAccountRecord,
  UserRole,
  WalletRecord,
} from '../game/types';
import { buildTimestamp, getDatabase } from './db';

type DatabaseConnection = Awaited<ReturnType<typeof getDatabase>>['sqlite'];
type BatchStatement = { sql: string; parameters?: ReadonlyArray<unknown> };

type ModuleRow = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  data_json: string;
};

type CharacterRow = {
  id: string;
  module_id: string;
  name: string;
  summary: string;
  data_json: string;
};

type GameRow = {
  id: string;
  user_id: string;
  module_id: string;
  character_id: string;
  opencode_session_id: string;
  workspace_path: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type WalletRow = {
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

type BillingLedgerRow = {
  id: string;
  user_id: string;
  game_id: string | null;
  type: string;
  amount: number;
  balance_after: number;
  reason: string;
  created_at: string;
};

type GameMessageRow = {
  id: string;
  game_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_meta_json: string;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: number;
};

function normalizeUserRole(value: string): UserRole {
  return value === 'editor' ? 'editor' : 'user';
}

function mapUser(row: UserRow): UserAccountRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: normalizeUserRole(row.role),
    createdAt: row.createdAt,
  };
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

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

function mapCharacter(row: CharacterRow): CharacterRecord {
  return {
    id: row.id,
    moduleId: row.module_id,
    name: row.name,
    summary: row.summary,
    data: parseJson<Record<string, unknown>>(row.data_json),
  };
}

function mapGame(row: GameRow): GameRecord {
  return {
    id: row.id,
    userId: row.user_id,
    moduleId: row.module_id,
    characterId: row.character_id,
    opencodeSessionId: row.opencode_session_id,
    workspacePath: row.workspace_path,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWallet(row: WalletRow): WalletRecord {
  return {
    userId: row.user_id,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBillingLedger(row: BillingLedgerRow): BillingLedgerRecord {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    type: row.type,
    amount: row.amount,
    balanceAfter: row.balance_after,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function mapGameMessage(row: GameMessageRow): GameMessageRecord {
  return {
    id: row.id,
    gameId: row.game_id,
    role: row.role,
    content: row.content,
    meta: parseJson<Record<string, unknown>>(row.message_meta_json),
    createdAt: row.created_at,
  };
}

async function queryAll<T>(
  sqlite: DatabaseConnection,
  sql: string,
  parameters: ReadonlyArray<unknown> = [],
): Promise<T[]> {
  return (await sqlite.execute<T>(sql, parameters)).rows;
}

async function queryFirst<T>(
  sqlite: DatabaseConnection,
  sql: string,
  parameters: ReadonlyArray<unknown> = [],
): Promise<T | null> {
  const rows = await queryAll<T>(sqlite, sql, parameters);
  return rows[0] ?? null;
}

async function getWalletRowByUserId(sqlite: DatabaseConnection, userId: string): Promise<WalletRow | null> {
  return queryFirst<WalletRow>(sqlite, 'SELECT * FROM wallets WHERE user_id = ?', [userId]);
}

function buildEnsureWalletStatement(userId: string, timestamp: string): BatchStatement {
  return {
    sql: 'INSERT OR IGNORE INTO wallets (user_id, balance, created_at, updated_at) VALUES (?, ?, ?, ?)',
    parameters: [userId, 100, timestamp, timestamp],
  };
}

async function ensureWalletInDatabase(sqlite: DatabaseConnection, userId: string): Promise<WalletRecord> {
  const timestamp = buildTimestamp();
  const statement = buildEnsureWalletStatement(userId, timestamp);
  await sqlite.execute(statement.sql, statement.parameters);
  const wallet = await getWalletRowByUserId(sqlite, userId);
  if (!wallet) {
    throw new Error('创建钱包失败');
  }
  return mapWallet(wallet);
}

async function createGameMessageInDatabase(
  sqlite: DatabaseConnection,
  input: {
    gameId: string;
    role: 'user' | 'assistant';
    content: string;
    meta?: Record<string, unknown>;
  },
): Promise<GameMessageRecord> {
  const id = randomUUID();
  const createdAt = buildTimestamp();
  await sqlite.execute(
    'INSERT INTO game_messages (id, game_id, role, content, message_meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [id, input.gameId, input.role, input.content, JSON.stringify(input.meta ?? {}), createdAt],
  );
  return {
    id,
    gameId: input.gameId,
    role: input.role,
    content: input.content,
    meta: input.meta ?? {},
    createdAt,
  };
}

function buildWalletChargeBatch(input: {
  userId: string;
  gameId: string;
  amount: number;
  reason: string;
  updatedAt: string;
  ledgerId: string;
}): BatchStatement[] {
  return [
    {
      sql: 'UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE user_id = ? AND balance >= ?',
      parameters: [input.amount, input.updatedAt, input.userId, input.amount],
    },
    {
      sql: `INSERT INTO billing_ledger (id, user_id, game_id, type, amount, balance_after, reason, created_at)
            SELECT ?, ?, ?, 'debit', ?, balance, ?, ?
            FROM wallets
            WHERE user_id = ? AND changes() > 0`,
      parameters: [
        input.ledgerId,
        input.userId,
        input.gameId,
        -input.amount,
        input.reason,
        input.updatedAt,
        input.userId,
      ],
    },
  ];
}

export async function getUserById(id: string): Promise<UserAccountRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await queryFirst<UserRow>(sqlite, 'SELECT id, email, name, role, createdAt FROM "user" WHERE id = ?', [
    id,
  ]);
  return row ? mapUser(row) : null;
}

export async function listAllUsers(): Promise<UserAccountRecord[]> {
  const { sqlite } = await getDatabase();
  const rows = await queryAll<UserRow>(
    sqlite,
    'SELECT id, email, name, role, createdAt FROM "user" ORDER BY createdAt DESC',
  );
  return rows.map(mapUser);
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserAccountRecord | null> {
  const { sqlite } = await getDatabase();
  const updatedAt = Date.now();
  await sqlite.execute('UPDATE "user" SET role = ?, updatedAt = ? WHERE id = ?', [role, updatedAt, id]);
  return getUserById(id);
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

export async function getWalletByUserId(userId: string): Promise<WalletRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await getWalletRowByUserId(sqlite, userId);
  return row ? mapWallet(row) : null;
}

export async function ensureWallet(userId: string): Promise<WalletRecord> {
  const { sqlite } = await getDatabase();
  return ensureWalletInDatabase(sqlite, userId);
}

export async function createGame(input: {
  id?: string;
  userId: string;
  moduleId: string;
  characterId: string;
  opencodeSessionId: string;
  workspacePath: string;
}): Promise<GameRecord> {
  const { sqlite } = await getDatabase();
  const id = input.id ?? randomUUID();
  const timestamp = buildTimestamp();
  await sqlite.execute(
    `INSERT INTO games (
      id, user_id, module_id, character_id, opencode_session_id, workspace_path, status, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.userId,
      input.moduleId,
      input.characterId,
      input.opencodeSessionId,
      input.workspacePath,
      'active',
      timestamp,
      timestamp,
    ],
  );
  return {
    id,
    userId: input.userId,
    moduleId: input.moduleId,
    characterId: input.characterId,
    opencodeSessionId: input.opencodeSessionId,
    workspacePath: input.workspacePath,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function getGameByIdForUser(gameId: string, userId: string): Promise<GameRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await queryFirst<GameRow>(sqlite, 'SELECT * FROM games WHERE id = ? AND user_id = ?', [gameId, userId]);
  return row ? mapGame(row) : null;
}

export async function listMessagesByGameId(gameId: string): Promise<GameMessageRecord[]> {
  const { sqlite } = await getDatabase();
  return (
    await queryAll<GameMessageRow>(sqlite, 'SELECT * FROM game_messages WHERE game_id = ? ORDER BY created_at ASC', [
      gameId,
    ])
  ).map(mapGameMessage);
}

export async function findGameMessageByMeta(
  gameId: string,
  key: string,
  value: string,
): Promise<GameMessageRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await queryFirst<GameMessageRow>(
    sqlite,
    `SELECT * FROM game_messages
     WHERE game_id = ? AND json_extract(message_meta_json, ?) = ?
     LIMIT 1`,
    [gameId, `$.${key}`, value],
  );
  return row ? mapGameMessage(row) : null;
}

export async function createGameMessage(input: {
  gameId: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: Record<string, unknown>;
}): Promise<GameMessageRecord> {
  const { sqlite } = await getDatabase();
  return createGameMessageInDatabase(sqlite, input);
}

export async function recordGameTurn(input: {
  userId: string;
  gameId: string;
  userContent: string;
  assistantContent: string;
  userMeta?: Record<string, unknown>;
  assistantMeta?: Record<string, unknown>;
  chargeAmount: number;
  reason: string;
}): Promise<{
  userMessage: GameMessageRecord;
  assistantMessage: GameMessageRecord;
  wallet: WalletRecord;
}> {
  const { sqlite } = await getDatabase();
  const timestamp = buildTimestamp();
  const userMessage: GameMessageRecord = {
    id: randomUUID(),
    gameId: input.gameId,
    role: 'user',
    content: input.userContent,
    meta: input.userMeta ?? {},
    createdAt: timestamp,
  };
  const assistantMessage: GameMessageRecord = {
    id: randomUUID(),
    gameId: input.gameId,
    role: 'assistant',
    content: input.assistantContent,
    meta: input.assistantMeta ?? {},
    createdAt: timestamp,
  };
  const statements: BatchStatement[] = [buildEnsureWalletStatement(input.userId, timestamp)];

  if (input.chargeAmount > 0) {
    statements.push(
      ...buildWalletChargeBatch({
        userId: input.userId,
        gameId: input.gameId,
        amount: input.chargeAmount,
        reason: input.reason,
        updatedAt: timestamp,
        ledgerId: randomUUID(),
      }),
      {
        sql: `INSERT INTO game_messages (id, game_id, role, content, message_meta_json, created_at)
              SELECT ?, ?, ?, ?, ?, ?
              WHERE changes() > 0`,
        parameters: [
          userMessage.id,
          userMessage.gameId,
          userMessage.role,
          userMessage.content,
          JSON.stringify(userMessage.meta),
          userMessage.createdAt,
        ],
      },
      {
        sql: `INSERT INTO game_messages (id, game_id, role, content, message_meta_json, created_at)
              SELECT ?, ?, ?, ?, ?, ?
              WHERE changes() > 0`,
        parameters: [
          assistantMessage.id,
          assistantMessage.gameId,
          assistantMessage.role,
          assistantMessage.content,
          JSON.stringify(assistantMessage.meta),
          assistantMessage.createdAt,
        ],
      },
    );
  } else {
    statements.push(
      {
        sql: 'INSERT INTO game_messages (id, game_id, role, content, message_meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        parameters: [
          userMessage.id,
          userMessage.gameId,
          userMessage.role,
          userMessage.content,
          JSON.stringify(userMessage.meta),
          userMessage.createdAt,
        ],
      },
      {
        sql: 'INSERT INTO game_messages (id, game_id, role, content, message_meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        parameters: [
          assistantMessage.id,
          assistantMessage.gameId,
          assistantMessage.role,
          assistantMessage.content,
          JSON.stringify(assistantMessage.meta),
          assistantMessage.createdAt,
        ],
      },
    );
  }

  statements.push({ sql: 'SELECT * FROM wallets WHERE user_id = ?', parameters: [input.userId] });
  const results = await sqlite.batch<WalletRow>(statements);
  const chargeResult = input.chargeAmount > 0 ? results[1] : null;
  if (input.chargeAmount > 0 && chargeResult && chargeResult.changes === 0) {
    throw new Error('余额不足');
  }
  const walletResult = results[results.length - 1];
  const walletRow = walletResult?.rows[0];
  if (!walletRow) {
    throw new Error('读取钱包失败');
  }
  return {
    userMessage,
    assistantMessage,
    wallet: mapWallet(walletRow),
  };
}

export async function chargeWallet(input: {
  userId: string;
  gameId: string;
  amount: number;
  reason: string;
}): Promise<WalletRecord> {
  const { sqlite } = await getDatabase();
  if (input.amount === 0) {
    return ensureWalletInDatabase(sqlite, input.userId);
  }
  const timestamp = buildTimestamp();
  const results = await sqlite.batch<WalletRow>([
    buildEnsureWalletStatement(input.userId, timestamp),
    ...buildWalletChargeBatch({
      userId: input.userId,
      gameId: input.gameId,
      amount: input.amount,
      reason: input.reason,
      updatedAt: timestamp,
      ledgerId: randomUUID(),
    }),
    { sql: 'SELECT * FROM wallets WHERE user_id = ?', parameters: [input.userId] },
  ]);
  if (results[1]?.changes === 0) {
    throw new Error('余额不足');
  }
  const walletResult = results[results.length - 1];
  const walletRow = walletResult?.rows[0];
  if (!walletRow) {
    throw new Error('读取钱包失败');
  }
  return mapWallet(walletRow);
}

export async function listBillingLedger(userId: string): Promise<BillingLedgerRecord[]> {
  const { sqlite } = await getDatabase();
  return (
    await queryAll<BillingLedgerRow>(
      sqlite,
      'SELECT * FROM billing_ledger WHERE user_id = ? ORDER BY created_at DESC',
      [userId],
    )
  ).map(mapBillingLedger);
}
