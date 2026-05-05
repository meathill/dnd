import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFetchWebsiteGameContext,
  mockFetchWebsiteGameContextAsInternal,
  mockRecordWebsiteTurnAsInternal,
  mockSendWebsiteChatCompletion,
  mockSendWebsiteGameMessage,
  mockSendWebsiteGameMessageAsInternal,
} = vi.hoisted(() => ({
  mockFetchWebsiteGameContext: vi.fn(),
  mockFetchWebsiteGameContextAsInternal: vi.fn(),
  mockRecordWebsiteTurnAsInternal: vi.fn(),
  mockSendWebsiteChatCompletion: vi.fn(),
  mockSendWebsiteGameMessage: vi.fn(),
  mockSendWebsiteGameMessageAsInternal: vi.fn(),
}));

vi.mock('./website-client', () => ({
  fetchWebsiteGameContext: mockFetchWebsiteGameContext,
  fetchWebsiteGameContextAsInternal: mockFetchWebsiteGameContextAsInternal,
  recordWebsiteTurnAsInternal: mockRecordWebsiteTurnAsInternal,
  sendWebsiteChatCompletion: mockSendWebsiteChatCompletion,
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
    mockRecordWebsiteTurnAsInternal.mockResolvedValue({
      userMessage: {
        id: 'user-message-1',
        gameId: 'game-1',
        role: 'user',
        content: 'hello',
        meta: { runtime: 'play' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      assistantMessage: {
        id: 'assistant-message-1',
        gameId: 'game-1',
        role: 'assistant',
        content: 'reply',
        meta: { runtime: 'stub' },
        createdAt: '2026-01-01T00:00:01.000Z',
      },
      balance: 95,
    });
    mockSendWebsiteChatCompletion.mockResolvedValue({
      responseId: 'chatcmpl-1',
      content: 'reply',
      modelId: 'gpt-4.1-mini',
      finishReason: 'stop',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
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
    expect(mockRecordWebsiteTurnAsInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-1',
        userId: 'user-1',
        balance: 100,
        cookieHeader: 'cookie=value',
        userContent: 'hello',
        chargeAmount: 5,
      }),
    );
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

  it('uses llmproxy-backed opencode runtime when configured', async () => {
    process.env.PLAY_RUNTIME = 'opencode';

    const result = await sendPlayMessage('game-1', 'hello', session, 'cookie=value');

    expect(result.balance).toBe(95);
    expect(mockSendWebsiteChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        gameId: 'game-1',
        model: 'gpt-4.1-mini',
      }),
    );
    expect(mockSendWebsiteChatCompletion.mock.calls[0]?.[0]?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'hello' }),
      ]),
    );
    expect(mockRecordWebsiteTurnAsInternal).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: 'game-1',
        userId: 'user-1',
        assistantContent: 'reply',
        assistantMeta: expect.objectContaining({
          runtime: 'opencode',
          providerId: 'llmproxy',
          modelId: 'gpt-4.1-mini',
          finishReason: 'stop',
          responseId: 'chatcmpl-1',
          tokens: {
            promptTokens: 100,
            completionTokens: 50,
            totalTokens: 150,
          },
        }),
      }),
    );
  });

  it('rejects opencode runtime before calling model when balance is insufficient', async () => {
    process.env.PLAY_RUNTIME = 'opencode';

    await expect(sendPlayMessage('game-1', 'hello', { ...session, balance: 4 }, 'cookie=value')).rejects.toThrow(
      '余额不足',
    );

    expect(mockSendWebsiteChatCompletion).not.toHaveBeenCalled();
  });
});
