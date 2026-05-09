import type { BillingLedgerRecord } from '../game/types';
import { queryAll } from './_internal';
import { getDatabase } from './db';

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
