import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetRequestIdentity, mockGetGameContext } = vi.hoisted(() => ({
  mockGetRequestIdentity: vi.fn(),
  mockGetGameContext: vi.fn(),
}));

vi.mock('@/lib/internal/request-auth', () => ({
  getRequestIdentity: mockGetRequestIdentity,
}));

vi.mock('@/lib/game/runtime', () => ({
  getGameContext: mockGetGameContext,
}));

import { GET } from './route';

describe('GET /api/games/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestIdentity.mockResolvedValue({
      userId: 'user-1',
      balance: 100,
    });
    mockGetGameContext.mockResolvedValue({
      game: { id: 'game-1' },
      gameUrl: '/games/game-1',
      module: { title: '破门驱邪' },
      character: { name: '林雾' },
      messages: [],
    });
  });

  it('returns game context for authenticated session', async () => {
    const response = await GET(new Request('http://localhost/api/games/game-1'), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { game: { id: string } };

    expect(response.status).toBe(200);
    expect(payload.game.id).toBe('game-1');
    expect(mockGetGameContext).toHaveBeenCalledWith('game-1', 'user-1');
  });

  it('returns 401 when session is missing', async () => {
    const unauthorized = NextResponse.json({ error: '未登录' }, { status: 401 });
    mockGetRequestIdentity.mockResolvedValue(unauthorized);

    const response = await GET(new Request('http://localhost/api/games/game-1'), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe('未登录');
  });

  it('maps missing game to 404', async () => {
    mockGetGameContext.mockRejectedValue(new Error('游戏不存在'));

    const response = await GET(new Request('http://localhost/api/games/game-1'), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('游戏不存在');
  });
});
