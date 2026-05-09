import { randomUUID } from 'node:crypto';
import type { WalletRecord } from '../game/types';
import { type BatchStatement, type DatabaseConnection, queryFirst } from './_internal';
import { buildTimestamp, getDatabase } from './db';

export type WalletRow = {
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
};

export function mapWallet(row: WalletRow): WalletRecord {
  return {
    userId: row.user_id,
    balance: row.balance,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getWalletRowByUserId(sqlite: DatabaseConnection, userId: string): Promise<WalletRow | null> {
  return queryFirst<WalletRow>(sqlite, 'SELECT * FROM wallets WHERE user_id = ?', [userId]);
}

export function buildEnsureWalletStatement(userId: string, timestamp: string): BatchStatement {
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

export function buildWalletChargeBatch(input: {
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

export async function getWalletByUserId(userId: string): Promise<WalletRecord | null> {
  const { sqlite } = await getDatabase();
  const row = await getWalletRowByUserId(sqlite, userId);
  return row ? mapWallet(row) : null;
}

export async function ensureWallet(userId: string): Promise<WalletRecord> {
  const { sqlite } = await getDatabase();
  return ensureWalletInDatabase(sqlite, userId);
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
