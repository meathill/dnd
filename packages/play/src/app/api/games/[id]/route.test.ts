import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPlaySession, mockGetPlayGameContext } = vi.hoisted(() => ({
  mockGetPlaySession: vi.fn(),
  mockGetPlayGameContext: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue('cookie=value'),
  }),
}));

vi.mock('@/lib/play/session', () => ({
  getPlaySession: mockGetPlaySession,
}));

vi.mock('@/lib/play/runtime', () => ({
  getPlayGameContext: mockGetPlayGameContext,
}));

import { GET } from './route';

describe('play api/games/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlaySession.mockResolvedValue({
      userId: 'user-1',
      displayName: 'Smoke',
      email: 'smoke@example.com',
      balance: 100,
    });
    mockGetPlayGameContext.mockResolvedValue({
      game: { id: 'game-1' },
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
    expect(mockGetPlayGameContext).toHaveBeenCalledWith(
      'game-1',
      expect.objectContaining({ userId: 'user-1' }),
      'cookie=value',
    );
  });

  it('returns 401 when session is missing', async () => {
    mockGetPlaySession.mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/games/game-1'), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe('未登录');
  });

  it('maps missing game to 404', async () => {
    mockGetPlayGameContext.mockRejectedValue(new Error('游戏不存在'));

    const response = await GET(new Request('http://localhost/api/games/game-1'), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(404);
    expect(payload.error).toBe('游戏不存在');
  });
});
