import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../characters/route';
import { getAuth } from '../../../lib/auth/auth';

vi.mock('../../../lib/auth/auth', () => ({
  getAuth: vi.fn(),
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

function buildCharacterPayload() {
  return {
    scriptId: 'script-1',
    name: '沈砚',
    occupation: '',
    age: '',
    origin: '',
    appearance: '',
    background: '',
    motivation: '',
    avatar: '',
    luck: 55,
    attributes: { strength: 50 },
    skills: { spotHidden: 50 },
    inventory: [],
    buffs: [],
    debuffs: [],
    note: '',
  };
}

describe('POST /api/characters 权限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockSession(null);

    const response = await POST(
      new Request('http://localhost/api/characters', {
        method: 'POST',
        body: JSON.stringify(buildCharacterPayload()),
      }),
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('未登录无法创建人物卡');
  });
});
