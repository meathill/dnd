import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetRequestIdentity, mockGetGameByIdForUser, mockListMessagesByGameId, mockSendGameMessage } = vi.hoisted(
  () => ({
    mockGetRequestIdentity: vi.fn(),
    mockGetGameByIdForUser: vi.fn(),
    mockListMessagesByGameId: vi.fn(),
    mockSendGameMessage: vi.fn(),
  }),
);

vi.mock('@/lib/internal/request-auth', () => ({
  getRequestIdentity: mockGetRequestIdentity,
}));

vi.mock('@/lib/db/games-repo', () => ({
  getGameByIdForUser: mockGetGameByIdForUser,
  listMessagesByGameId: mockListMessagesByGameId,
}));

vi.mock('@/lib/game/runtime', () => ({
  sendGameMessage: mockSendGameMessage,
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
    mockGetRequestIdentity.mockResolvedValue({
      userId: defaultSession.userId,
      balance: defaultSession.balance,
    });
    mockGetGameByIdForUser.mockResolvedValue(game);
    mockListMessagesByGameId.mockResolvedValue([]);
    mockSendGameMessage.mockResolvedValue({
      userMessage: {
        id: 'user-message-1',
        role: 'user',
        content: 'hello',
        gameId: 'game-1',
        meta: {},
        createdAt: 'now',
      },
      assistantMessage: {
        id: 'assistant-message-1',
        role: 'assistant',
        content: 'assistant reply',
        gameId: 'game-1',
        meta: { runtime: 'stub' },
        createdAt: 'now',
      },
      balance: 95,
    });
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
    expect(mockSendGameMessage).toHaveBeenCalledWith(
      'game-1',
      'hello',
      expect.objectContaining({
        userId: 'user-1',
        balance: 100,
      }),
    );
  });

  it('maps insufficient balance to 402', async () => {
    mockSendGameMessage.mockRejectedValue(new Error('余额不足'));

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(402);
    expect(payload.error).toBe('余额不足');
  });

  it('maps runtime failure to 502', async () => {
    mockSendGameMessage.mockRejectedValue(new Error('模型请求失败'));

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(payload.error).toBe('模型请求失败');
  });

  it('returns 404 when the game is missing', async () => {
    mockSendGameMessage.mockRejectedValue(new Error('游戏不存在'));

    const response = await POST(createPostRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('游戏不存在');
  });
});
