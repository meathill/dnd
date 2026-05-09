import { randomUUID } from 'node:crypto';
import type { GameMessageRecord, GameRecord, WalletRecord } from '../game/types';
import { type BatchStatement, type DatabaseConnection, parseJson, queryAll, queryFirst } from './_internal';
import { buildTimestamp, getDatabase } from './db';
import { buildEnsureWalletStatement, buildWalletChargeBatch, mapWallet, type WalletRow } from './wallets-repo';

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

type GameMessageRow = {
  id: string;
  game_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_meta_json: string;
  created_at: string;
};

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
