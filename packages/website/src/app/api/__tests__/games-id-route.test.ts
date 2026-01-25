import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../games/[id]/route';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import { getCharacterByIdForUser, getGameByIdForUser, getScriptById } from '../../../lib/db/repositories';

vi.mock('../../../lib/auth/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('../../../lib/db/db', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../../lib/db/repositories', () => ({
  getCharacterByIdForUser: vi.fn(),
  getGameByIdForUser: vi.fn(),
  getScriptById: vi.fn(),
}));

type AuthSession = {
  user: { id: string };
};

type AuthApi = {
  getSession: (options: { headers: Headers }) => Promise<AuthSession | null>;
};

type AuthClient = {
  api: AuthApi;
};

function mockSession(session: AuthSession | null) {
  const authClient: AuthClient = {
    api: {
      getSession: vi.fn().mockResolvedValue(session),
    },
  };
  vi.mocked(getAuth).mockResolvedValue(authClient);
}

describe('GET /api/games/:id 权限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockSession(null);

    const response = await GET(new Request('http://localhost/api/games/game-1'), {
      params: Promise.resolve({ id: 'game-1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('未登录无法读取游戏');
  });

  it('游戏不属于当前用户返回 404', async () => {
    mockSession({ user: { id: 'user-1' } });
    vi.mocked(getDatabase).mockResolvedValue({} as D1Database);
    vi.mocked(getGameByIdForUser).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/games/game-2', { headers: { cookie: 'auth=stub' } }), {
      params: Promise.resolve({ id: 'game-2' }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('游戏不存在');
    expect(vi.mocked(getScriptById)).not.toHaveBeenCalled();
    expect(vi.mocked(getCharacterByIdForUser)).not.toHaveBeenCalled();
  });
});
