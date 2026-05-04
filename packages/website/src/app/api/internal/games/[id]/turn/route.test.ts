import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetRequestIdentity, mockGetGameByIdForUser, mockRecordGameTurn } = vi.hoisted(() => ({
  mockGetRequestIdentity: vi.fn(),
  mockGetGameByIdForUser: vi.fn(),
  mockRecordGameTurn: vi.fn(),
}));

vi.mock('@/lib/internal/request-auth', () => ({
  getRequestIdentity: mockGetRequestIdentity,
}));

vi.mock('@/lib/db/repositories', () => ({
  getGameByIdForUser: mockGetGameByIdForUser,
  recordGameTurn: mockRecordGameTurn,
}));

import { POST } from './route';

function createRequest(body: unknown) {
  return new Request('http://localhost/api/internal/games/game-1/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('internal turn route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestIdentity.mockResolvedValue({
      kind: 'internal',
      userId: 'user-1',
      balance: 100,
    });
    mockGetGameByIdForUser.mockResolvedValue({ id: 'game-1', userId: 'user-1' });
    mockRecordGameTurn.mockResolvedValue({
      userMessage: { id: 'user-message-1', role: 'user', content: 'hello' },
      assistantMessage: { id: 'assistant-message-1', role: 'assistant', content: 'reply' },
      wallet: { balance: 95 },
    });
  });

  it('records a turn and charges wallet', async () => {
    const response = await POST(
      createRequest({
        userContent: 'hello',
        assistantContent: 'reply',
        assistantMeta: { runtime: 'stub' },
      }),
      { params: Promise.resolve({ id: 'game-1' }) },
    );
    const payload = (await response.json()) as {
      balance: number;
      userMessage: { id: string };
      assistantMessage: { id: string };
    };

    expect(response.status).toBe(200);
    expect(payload.balance).toBe(95);
    expect(payload.userMessage.id).toBe('user-message-1');
    expect(payload.assistantMessage.id).toBe('assistant-message-1');
    expect(mockRecordGameTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        gameId: 'game-1',
        userContent: 'hello',
        assistantContent: 'reply',
        chargeAmount: 5,
      }),
    );
  });

  it('returns 400 when content is missing', async () => {
    const response = await POST(createRequest({ userContent: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('缺少回合消息内容');
  });

  it('returns 402 when wallet balance is insufficient', async () => {
    mockRecordGameTurn.mockRejectedValue(new Error('余额不足'));

    const response = await POST(
      createRequest({
        userContent: 'hello',
        assistantContent: 'reply',
      }),
      { params: Promise.resolve({ id: 'game-1' }) },
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(402);
    expect(payload.error).toBe('余额不足');
  });

  it('returns 404 when game is missing', async () => {
    mockGetGameByIdForUser.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        userContent: 'hello',
        assistantContent: 'reply',
      }),
      { params: Promise.resolve({ id: 'game-1' }) },
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('游戏不存在');
    expect(mockRecordGameTurn).not.toHaveBeenCalled();
  });
});
