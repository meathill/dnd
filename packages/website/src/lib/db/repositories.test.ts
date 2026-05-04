import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDatabase } from './db';
import {
  chargeWallet,
  createGame,
  createGameMessage,
  ensureWallet,
  getCharacterById,
  getGameByIdForUser,
  getModuleById,
  listBillingLedger,
  listMessagesByGameId,
  listModules,
  recordGameTurn,
} from './repositories';

let databaseDir = '';

async function seedUser(userId: string): Promise<void> {
  const { sqlite } = await getDatabase();
  const timestamp = Date.now();
  sqlite.run(
    'INSERT INTO "user" (id, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [userId, `${userId}@example.com`, 0, timestamp, timestamp],
  );
}

beforeEach(async () => {
  databaseDir = await mkdtemp(join(tmpdir(), 'dnd-website-db-'));
  process.env.DATABASE_URL = join(databaseDir, 'website.sqlite');
});

afterEach(async () => {
  delete process.env.DATABASE_URL;
  await rm(databaseDir, { recursive: true, force: true });
});

describe('repositories', () => {
  it('lists seeded modules and characters', async () => {
    const modules = await listModules();
    expect(modules).toHaveLength(1);
    expect(modules[0]?.id).toBe('script-exorcism-door');

    const moduleRecord = await getModuleById('script-exorcism-door');
    const characterRecord = await getCharacterById('character-lin-wu');

    expect(moduleRecord?.title).toBe('破门驱邪');
    expect(characterRecord?.name).toBe('林雾');
  });

  it('creates game, messages and charges wallet', async () => {
    await seedUser('user-1');
    const wallet = await ensureWallet('user-1');
    expect(wallet.balance).toBe(100);

    const game = await createGame({
      id: 'game-1',
      userId: 'user-1',
      moduleId: 'script-exorcism-door',
      characterId: 'character-lin-wu',
      opencodeSessionId: 'session-1',
      workspacePath: '/tmp/workspace/user-1/game-1',
    });

    await createGameMessage({
      gameId: game.id,
      role: 'user',
      content: '我推门进入老宅。',
    });

    const chargedWallet = await chargeWallet({
      userId: 'user-1',
      gameId: game.id,
      amount: 5,
      reason: '游戏回合扣费',
    });

    const storedGame = await getGameByIdForUser(game.id, 'user-1');
    const messages = await listMessagesByGameId(game.id);
    const ledger = await listBillingLedger('user-1');

    expect(game.id).toBe('game-1');
    expect(storedGame?.opencodeSessionId).toBe('session-1');
    expect(storedGame?.workspacePath).toBe('/tmp/workspace/user-1/game-1');
    expect(messages).toHaveLength(1);
    expect(chargedWallet.balance).toBe(95);
    expect(ledger[0]?.balanceAfter).toBe(95);
  });

  it('records a turn atomically with wallet charge', async () => {
    await seedUser('user-1');
    await ensureWallet('user-1');

    const game = await createGame({
      id: 'game-1',
      userId: 'user-1',
      moduleId: 'script-exorcism-door',
      characterId: 'character-lin-wu',
      opencodeSessionId: 'session-1',
      workspacePath: '/tmp/workspace/user-1/game-1',
    });

    const turn = await recordGameTurn({
      userId: 'user-1',
      gameId: game.id,
      userContent: '我推门进入老宅。',
      assistantContent: '门后传来潮湿木板的呻吟声。',
      userMeta: { runtime: 'play' },
      assistantMeta: { runtime: 'stub' },
      chargeAmount: 5,
      reason: '游戏回合扣费',
    });

    const messages = await listMessagesByGameId(game.id);
    const ledger = await listBillingLedger('user-1');

    expect(turn.wallet.balance).toBe(95);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.content).toBe('我推门进入老宅。');
    expect(messages[1]?.content).toBe('门后传来潮湿木板的呻吟声。');
    expect(ledger[0]?.balanceAfter).toBe(95);
  });

  it('rolls back messages when wallet balance is insufficient during turn recording', async () => {
    await seedUser('user-1');
    const { sqlite } = await getDatabase();
    sqlite.run('INSERT INTO wallets (user_id, balance, created_at, updated_at) VALUES (?, ?, ?, ?)', [
      'user-1',
      4,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
    ]);

    const game = await createGame({
      id: 'game-1',
      userId: 'user-1',
      moduleId: 'script-exorcism-door',
      characterId: 'character-lin-wu',
      opencodeSessionId: 'session-1',
      workspacePath: '/tmp/workspace/user-1/game-1',
    });

    await expect(
      recordGameTurn({
        userId: 'user-1',
        gameId: game.id,
        userContent: '我推门进入老宅。',
        assistantContent: '门后传来潮湿木板的呻吟声。',
        chargeAmount: 5,
        reason: '游戏回合扣费',
      }),
    ).rejects.toThrow('余额不足');

    const messages = await listMessagesByGameId(game.id);
    const ledger = await listBillingLedger('user-1');

    expect(messages).toHaveLength(0);
    expect(ledger).toHaveLength(0);
  });
});
