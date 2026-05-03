import { randomUUID } from 'node:crypto';
import type { Message } from '@opencode-ai/sdk';
import { buildTimestamp, getDatabase } from './db';
import type {
  BillingLedgerRecord,
  CharacterRecord,
  GameMessageRecord,
  GameRecord,
  ModuleRecord,
  WalletRecord,
} from '../game/types';

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

export async function listModules(): Promise<ModuleRecord[]> {
  const { sqlite } = await getDatabase();
  return sqlite.all<ModuleRow>('SELECT * FROM modules ORDER BY created_at DESC').map(mapModule);
}

export async function getModuleById(id: string): Promise<ModuleRecord | null> {
  const { sqlite } = await getDatabase();
  const row = sqlite.get<ModuleRow>('SELECT * FROM modules WHERE id = ?', [id]);
  return row ? mapModule(row) : null;
}

export async function listCharactersByModuleId(moduleId: string): Promise<CharacterRecord[]> {
  const { sqlite } = await getDatabase();
  return sqlite
    .all<CharacterRow>('SELECT * FROM characters WHERE module_id = ? ORDER BY created_at ASC', [moduleId])
    .map(mapCharacter);
}

export async function getCharacterById(id: string): Promise<CharacterRecord | null> {
  const { sqlite } = await getDatabase();
  const row = sqlite.get<CharacterRow>('SELECT * FROM characters WHERE id = ?', [id]);
  return row ? mapCharacter(row) : null;
}

export async function getWalletByUserId(userId: string): Promise<WalletRecord | null> {
  const { sqlite } = await getDatabase();
  const row = sqlite.get<WalletRow>('SELECT * FROM wallets WHERE user_id = ?', [userId]);
  return row ? mapWallet(row) : null;
}

export async function ensureWallet(userId: string): Promise<WalletRecord> {
  const existing = await getWalletByUserId(userId);
  if (existing) {
    return existing;
  }
  const { sqlite } = await getDatabase();
  const timestamp = buildTimestamp();
  sqlite.run('INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES (?, ?, ?, ?)', [
    userId,
    100,
    timestamp,
    timestamp,
  ]);
  return {
    userId,
    balance: 100,
    createdAt: timestamp,
    updatedAt: timestamp,
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
  sqlite.run(
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
  const row = sqlite.get<GameRow>('SELECT * FROM games WHERE id = ? AND user_id = ?', [gameId, userId]);
  return row ? mapGame(row) : null;
}

export async function listMessagesByGameId(gameId: string): Promise<GameMessageRecord[]> {
  const { sqlite } = await getDatabase();
  return sqlite
    .all<GameMessageRow>('SELECT * FROM game_messages WHERE game_id = ? ORDER BY created_at ASC', [gameId])
    .map(mapGameMessage);
}

export async function findGameMessageByMeta(gameId: string, key: string, value: string): Promise<GameMessageRecord | null> {
  const { sqlite } = await getDatabase();
  const row = sqlite.get<GameMessageRow>(
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
  const id = randomUUID();
  const createdAt = buildTimestamp();
  sqlite.run(
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

export async function chargeWallet(input: {
  userId: string;
  gameId: string;
  amount: number;
  reason: string;
}): Promise<WalletRecord> {
  const { sqlite } = await getDatabase();
  const wallet = await ensureWallet(input.userId);
  const nextBalance = wallet.balance - input.amount;
  if (nextBalance < 0) {
    throw new Error('余额不足');
  }
  const timestamp = buildTimestamp();
  sqlite.run('UPDATE wallets SET balance = ?, updated_at = ? WHERE user_id = ?', [nextBalance, timestamp, input.userId]);
  sqlite.run(
    'INSERT INTO billing_ledger (id, user_id, game_id, type, amount, balance_after, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [randomUUID(), input.userId, input.gameId, 'debit', -input.amount, nextBalance, input.reason, timestamp],
  );
  return {
    userId: input.userId,
    balance: nextBalance,
    createdAt: wallet.createdAt,
    updatedAt: timestamp,
  };
}

export async function listBillingLedger(userId: string): Promise<BillingLedgerRecord[]> {
  const { sqlite } = await getDatabase();
  return sqlite
    .all<BillingLedgerRow>('SELECT * FROM billing_ledger WHERE user_id = ? ORDER BY created_at DESC', [userId])
    .map(mapBillingLedger);
}

export function buildAssistantMeta(message: Message | null, extra: Record<string, unknown> = {}): Record<string, unknown> {
  if (!message || message.role !== 'assistant') {
    return extra;
  }
  return {
    ...extra,
    providerId: message.providerID,
    modelId: message.modelID,
    cost: message.cost,
    tokens: message.tokens,
  };
}
