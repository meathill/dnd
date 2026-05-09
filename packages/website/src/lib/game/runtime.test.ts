import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetGameByIdForUser,
  mockGetModuleById,
  mockGetCharacterById,
  mockListMessagesByGameId,
  mockRecordGameTurn,
  mockCreateChatCompletion,
} = vi.hoisted(() => ({
  mockGetGameByIdForUser: vi.fn(),
  mockGetModuleById: vi.fn(),
  mockGetCharacterById: vi.fn(),
  mockListMessagesByGameId: vi.fn(),
  mockRecordGameTurn: vi.fn(),
  mockCreateChatCompletion: vi.fn(),
}));

vi.mock('../db/games-repo', () => ({
  getGameByIdForUser: mockGetGameByIdForUser,
  listMessagesByGameId: mockListMessagesByGameId,
  recordGameTurn: mockRecordGameTurn,
}));

vi.mock('../db/modules-repo', () => ({
  getModuleById: mockGetModuleById,
}));

vi.mock('../db/characters-repo', () => ({
  getCharacterById: mockGetCharacterById,
}));

vi.mock('../llm/chat-completion', () => ({
  createChatCompletion: mockCreateChatCompletion,
}));

import { getGameContext, sendGameMessage } from './runtime';

const gameContext = {
  game: {
    id: 'game-1',
    userId: 'user-1',
    moduleId: 'module-1',
    characterId: 'character-1',
    opencodeSessionId: 'local-runtime',
    workspacePath: '/workspace/user-1/game-1',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
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
  balance: 100,
};

describe('game runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(process.env, 'GAME_RUNTIME');
    Reflect.deleteProperty(process.env, 'GAME_LLM_MODEL');
    mockGetGameByIdForUser.mockResolvedValue(gameContext.game);
    mockGetModuleById.mockResolvedValue(gameContext.module);
    mockGetCharacterById.mockResolvedValue(gameContext.character);
    mockListMessagesByGameId.mockResolvedValue(gameContext.messages);
    mockRecordGameTurn.mockResolvedValue({
      userMessage: {
        id: 'user-message-1',
        gameId: 'game-1',
        role: 'user',
        content: 'hello',
        meta: { runtime: 'game' },
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
      wallet: {
        userId: 'user-1',
        balance: 95,
        createdAt: 'now',
        updatedAt: 'now',
      },
    });
    mockCreateChatCompletion.mockResolvedValue({
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
    Reflect.deleteProperty(process.env, 'GAME_RUNTIME');
    Reflect.deleteProperty(process.env, 'GAME_LLM_MODEL');
  });

  it('loads game context from database', async () => {
    const result = await getGameContext('game-1', 'user-1');

    expect(result.game.id).toBe('game-1');
    expect(result.gameUrl).toBe('/games/game-1');
    expect(mockGetGameByIdForUser).toHaveBeenCalledWith('game-1', 'user-1');
  });

  it('uses stub runtime by default', async () => {
    const result = await sendGameMessage('game-1', 'hello', session);

    expect(result.userMessage.content).toBe('hello');
    expect(mockRecordGameTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        gameId: 'game-1',
        userContent: 'hello',
        chargeAmount: 5,
        assistantMeta: expect.objectContaining({ runtime: 'stub' }),
      }),
    );
    expect(mockCreateChatCompletion).not.toHaveBeenCalled();
  });

  it('uses llm-backed runtime when configured', async () => {
    process.env.GAME_RUNTIME = 'opencode';

    const result = await sendGameMessage('game-1', 'hello', session);

    expect(result.balance).toBe(95);
    expect(mockCreateChatCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4.1-mini',
      }),
    );
    expect(mockCreateChatCompletion.mock.calls[0]?.[0]?.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user', content: 'hello' }),
      ]),
    );
    expect(mockRecordGameTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        assistantContent: 'reply',
        assistantMeta: expect.objectContaining({
          runtime: 'opencode',
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

  it('rejects llm runtime before calling model when balance is insufficient', async () => {
    process.env.GAME_RUNTIME = 'opencode';

    await expect(sendGameMessage('game-1', 'hello', { ...session, balance: 4 })).rejects.toThrow('余额不足');

    expect(mockCreateChatCompletion).not.toHaveBeenCalled();
  });
});
