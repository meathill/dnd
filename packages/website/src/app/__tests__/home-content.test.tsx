import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { HomeContent } from '../home-page';
import { SessionProvider } from '../../lib/session/session-context';
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

describe('首页脚本加载', () => {
  beforeEach(() => {
    resetGameStore();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('脚本为空时提示信息', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/scripts') {
        return createResponse({ scripts: [] });
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
      expect(screen.getByText('脚本列表为空，暂时使用示例剧本。请先执行数据库迁移导入剧本。')).toBeInTheDocument();
    });
  });

  it('读取失败会提示错误', async () => {
    const fetchMock = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/scripts') {
        return createResponse({}, { ok: false, status: 500 });
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
      expect(screen.getByText('无法读取脚本列表，暂时使用示例剧本。请检查数据库。')).toBeInTheDocument();
    });
  });
});
