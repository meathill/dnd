import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFetchWebsiteGameContext,
  mockFetchWebsiteGameContextAsInternal,
  mockSendWebsiteGameMessage,
  mockSendWebsiteGameMessageAsInternal,
} = vi.hoisted(() => ({
  mockFetchWebsiteGameContext: vi.fn(),
  mockFetchWebsiteGameContextAsInternal: vi.fn(),
  mockSendWebsiteGameMessage: vi.fn(),
  mockSendWebsiteGameMessageAsInternal: vi.fn(),
}));

vi.mock('./website-client', () => ({
  fetchWebsiteGameContext: mockFetchWebsiteGameContext,
  fetchWebsiteGameContextAsInternal: mockFetchWebsiteGameContextAsInternal,
  sendWebsiteGameMessage: mockSendWebsiteGameMessage,
  sendWebsiteGameMessageAsInternal: mockSendWebsiteGameMessageAsInternal,
}));

import { getPlayGameContext, sendPlayMessage } from './runtime';

const gameContext = {
  game: {
    id: 'game-1',
    userId: 'user-1',
    moduleId: 'module-1',
    characterId: 'character-1',
    opencodeSessionId: 'session-1',
    workspacePath: '/workspace/user-1/game-1',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  playUrl: 'https://play.muirpg.com/game-1',
  module: {
    id: 'module-1',
    title: '破门驱邪',
    summary: 'summary',
    setting: 'setting',
    difficulty: '中等',
    data: {},
  },
  character: {
    id: 'character-1',
    moduleId: 'module-1',
    name: '林雾',
    summary: 'summary',
    data: {},
  },
  messages: [],
};

const session = {
  userId: 'user-1',
  displayName: 'Smoke',
  email: 'smoke@example.com',
  balance: 100,
};

describe('play runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLAY_RUNTIME;
    mockFetchWebsiteGameContext.mockResolvedValue(gameContext);
  });

  afterEach(() => {
    delete process.env.PLAY_RUNTIME;
  });

  it('loads game context from website', async () => {
    const result = await getPlayGameContext('game-1', session, 'cookie=value');

    expect(result.game.id).toBe('game-1');
    expect(mockFetchWebsiteGameContext).toHaveBeenCalledWith('game-1', 'cookie=value');
  });

  it('loads game context through internal token path when cookie is unavailable', async () => {
    mockFetchWebsiteGameContextAsInternal.mockResolvedValue(gameContext);

    const result = await getPlayGameContext('game-1', session);

    expect(result.game.id).toBe('game-1');
    expect(mockFetchWebsiteGameContextAsInternal).toHaveBeenCalledWith({
      gameId: 'game-1',
      userId: 'user-1',
      balance: 100,
    });
  });

  it('uses stub runtime by default', async () => {
    const result = await sendPlayMessage('game-1', 'hello', session, 'cookie=value');

    expect(result.userMessage.content).toBe('hello');
    expect(result.assistantMessage.meta.runtime).toBe('stub');
    expect(mockSendWebsiteGameMessage).not.toHaveBeenCalled();
  });

  it('delegates to website runtime when configured', async () => {
    process.env.PLAY_RUNTIME = 'website';
    mockSendWebsiteGameMessage.mockResolvedValue({
      userMessage: { id: 'u1' },
      assistantMessage: { id: 'a1' },
      balance: 95,
    });

    const result = await sendPlayMessage('game-1', 'hello', session, 'cookie=value');

    expect(result.balance).toBe(95);
    expect(mockSendWebsiteGameMessage).toHaveBeenCalledWith('game-1', 'hello', 'cookie=value');
  });

  it('delegates to website runtime through internal token path when cookie is unavailable', async () => {
    process.env.PLAY_RUNTIME = 'website';
    mockSendWebsiteGameMessageAsInternal.mockResolvedValue({
      userMessage: { id: 'u1' },
      assistantMessage: { id: 'a1' },
      balance: 95,
    });

    const result = await sendPlayMessage('game-1', 'hello', session);

    expect(result.balance).toBe(95);
    expect(mockSendWebsiteGameMessageAsInternal).toHaveBeenCalledWith({
      gameId: 'game-1',
      userId: 'user-1',
      balance: 100,
      content: 'hello',
    });
  });

  it('throws for opencode runtime before integration lands', async () => {
    process.env.PLAY_RUNTIME = 'opencode';

    await expect(sendPlayMessage('game-1', 'hello', session, 'cookie=value')).rejects.toThrow('opencode runtime 尚未接入');
  });
});
