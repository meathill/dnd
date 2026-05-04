import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockReadFile,
  mockGetRequestSession,
  mockBuildAssistantMeta,
  mockChargeWallet,
  mockCreateGameMessage,
  mockGetGameByIdForUser,
  mockListMessagesByGameId,
  mockSendGameplayMessage,
} = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGetRequestSession: vi.fn(),
  mockBuildAssistantMeta: vi.fn(),
  mockChargeWallet: vi.fn(),
  mockCreateGameMessage: vi.fn(),
  mockGetGameByIdForUser: vi.fn(),
  mockListMessagesByGameId: vi.fn(),
  mockSendGameplayMessage: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: mockReadFile,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getRequestSession: mockGetRequestSession,
}));

vi.mock('@/lib/db/repositories', () => ({
  buildAssistantMeta: mockBuildAssistantMeta,
  chargeWallet: mockChargeWallet,
  createGameMessage: mockCreateGameMessage,
  getGameByIdForUser: mockGetGameByIdForUser,
  listMessagesByGameId: mockListMessagesByGameId,
}));

vi.mock('@/lib/opencode/gameplay', () => ({
  sendGameplayMessage: mockSendGameplayMessage,
}));

import { GET, POST } from './route';

const defaultSession = {
  userId: 'user-1',
  displayName: 'Smoke',
  email: 'smoke@example.com',
  balance: 100,
};

const game = {
  id: 'game-1',
  userId: 'user-1',
  moduleId: 'module-1',
  characterId: 'character-1',
  opencodeSessionId: 'session-1',
  workspacePath: '/workspace/user-1/game-1',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function createPostRequest(body: unknown) {
  return new Request('http://localhost/api/games/game-1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('games/[id]/messages route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue('system prompt');
    mockGetRequestSession.mockResolvedValue(defaultSession);
    mockGetGameByIdForUser.mockResolvedValue(game);
    mockBuildAssistantMeta.mockReturnValue({ sessionId: 'session-1', partCount: 1 });
    mockListMessagesByGameId.mockResolvedValue([]);
  });

  it('returns messages for an authenticated game owner', async () => {
    mockListMessagesByGameId.mockResolvedValue([{ id: 'message-1', role: 'user', content: 'hello' }]);

    const response = await GET(new Request('http://localhost/api/games/game-1/messages'), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { messages: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(payload.messages).toHaveLength(1);
  });

  it('sends message, stores transcript and charges wallet', async () => {
    mockSendGameplayMessage.mockResolvedValue({
      sessionId: 'session-1',
      assistantMessage: { role: 'assistant' },
      content: 'assistant reply',
      parts: [{ type: 'text', text: 'assistant reply' }],
    });
    mockCreateGameMessage
      .mockResolvedValueOnce({ id: 'user-message-1', role: 'user', content: 'hello', gameId: 'game-1', meta: {}, createdAt: 'now' })
      .mockResolvedValueOnce({ id: 'assistant-message-1', role: 'assistant', content: 'assistant reply', gameId: 'game-1', meta: {}, createdAt: 'now' });
    mockChargeWallet.mockResolvedValue({
      userId: 'user-1',
      balance: 95,
      createdAt: 'now',
      updatedAt: 'now',
    });

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as {
      balance: number;
      userMessage: { id: string };
      assistantMessage: { id: string };
    };

    expect(response.status).toBe(200);
    expect(payload.balance).toBe(95);
    expect(payload.userMessage.id).toBe('user-message-1');
    expect(payload.assistantMessage.id).toBe('assistant-message-1');
    expect(mockChargeWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        gameId: 'game-1',
        amount: 5,
      }),
    );
  });

  it('returns 402 when balance is insufficient before calling opencode', async () => {
    mockGetRequestSession.mockResolvedValue({
      ...defaultSession,
      balance: 4,
    });

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(402);
    expect(payload.error).toBe('余额不足');
    expect(mockSendGameplayMessage).not.toHaveBeenCalled();
  });

  it('returns 502 when opencode request fails and does not persist partial messages', async () => {
    mockSendGameplayMessage.mockRejectedValue(new Error('opencode timeout'));

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(payload.error).toBe('游戏服务暂不可用，请稍后重试');
    expect(mockCreateGameMessage).not.toHaveBeenCalled();
    expect(mockChargeWallet).not.toHaveBeenCalled();
  });

  it('returns 404 when the game is missing', async () => {
    mockGetGameByIdForUser.mockResolvedValue(null);

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('游戏不存在');
  });
});
