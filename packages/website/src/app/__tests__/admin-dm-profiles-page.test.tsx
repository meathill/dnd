import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AdminDmProfilesContent } from '../admin/dm-profiles/page';
import { SessionProvider } from '../../lib/session/session-context';
import type { SessionInfo } from '../../lib/session/session-types';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const originalFetch = global.fetch;

function createResponse(data: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => data,
  } as Response;
}

function renderWithSession(session: SessionInfo | null) {
  return render(
    <SessionProvider value={{ session, reloadSession: async () => null, requestAuth: vi.fn() }}>
      <AdminDmProfilesContent />
    </SessionProvider>,
  );
}

describe('DM 风格列表', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('加载并展示 DM 风格列表', async () => {
    const fetchMock = vi.fn(async () =>
      createResponse({ profiles: [{ id: 'dm-1', name: '温和推进', summary: '偏向剧情', isDefault: true }] }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession({ userId: 'root', displayName: 'Root', settings: null, isRoot: true });

    expect(await screen.findByText('温和推进')).toBeInTheDocument();
  });

  it('创建风格后跳转到编辑页', async () => {
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/dm-profiles' && init?.method === 'POST') {
        return createResponse({ profile: { id: 'dm-new', name: '高速推进', summary: '节奏更快', isDefault: false } });
      }
      return createResponse({ profiles: [] });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession({ userId: 'root', displayName: 'Root', settings: null, isRoot: true });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText('风格名称'), '高速推进');
    await user.type(screen.getByLabelText('简介'), '节奏更快');
    await user.click(screen.getByRole('button', { name: '创建风格' }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/admin/dm-profiles/dm-new');
    });
  });
});
