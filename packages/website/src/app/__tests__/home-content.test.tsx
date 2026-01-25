import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { HomeContent } from '../home-page';
import { SessionProvider } from '../../lib/session/session-context';
import type { SessionInfo } from '../../lib/session/session-types';
import { resetGameStore } from '../../lib/game/game-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const originalFetch = global.fetch;

function createResponse(data: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => data,
  } as Response;
}

describe('首页游戏记录加载', () => {
  beforeEach(() => {
    resetGameStore();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('未登录时不请求游戏记录', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/scripts') {
        return createResponse({ scripts: [] });
      }
      if (url === '/api/games') {
        return createResponse({ games: [] });
      }
      return createResponse({}, { ok: false, status: 404 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    render(
      <SessionProvider value={{ session: null, reloadSession: vi.fn(), requestAuth: vi.fn() }}>
        <HomeContent />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('登录后可查看游戏记录。')).toBeInTheDocument();
    });

    const gameCalls = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/games');
    expect(gameCalls).toHaveLength(0);
  });

  it('登录后会请求游戏记录', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/scripts') {
        return createResponse({ scripts: [] });
      }
      if (url === '/api/games') {
        return createResponse({ games: [] });
      }
      return createResponse({}, { ok: false, status: 404 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const session: SessionInfo = {
      userId: 'user-1',
      displayName: '测试玩家',
      settings: null,
    };

    render(
      <SessionProvider value={{ session, reloadSession: vi.fn(), requestAuth: vi.fn() }}>
        <HomeContent />
      </SessionProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/games', { cache: 'no-store' });
    });
  });
});
