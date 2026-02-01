import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, PUT } from '../characters/[id]/route';
import type { CharacterRecord, GameRecord } from '@/lib/game/types';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import { getCharacterByIdForUser, getGameByCharacterId } from '@/lib/db/repositories';

vi.mock('../../../lib/auth/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('../../../lib/db/db', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../../lib/db/repositories', () => ({
  deleteCharacter: vi.fn(),
  getCharacterByIdForUser: vi.fn(),
  getGameByCharacterId: vi.fn(),
  getScriptById: vi.fn(),
  updateCharacter: vi.fn(),
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

const sampleCharacter: CharacterRecord = {
  id: 'character-1',
  scriptId: 'script-1',
  name: '测试角色',
  occupation: '',
  age: '',
  origin: '',
  appearance: '',
  background: '',
  motivation: '',
  avatar: '',
  luck: 55,
  attributes: {
    strength: 50,
    dexterity: 50,
    constitution: 50,
    size: 50,
    intelligence: 50,
    willpower: 50,
    appearance: 50,
    education: 50,
  },
  skills: {},
  inventory: [],
  buffs: [],
  debuffs: [],
  note: '',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const sampleGame: GameRecord = {
  id: 'game-1',
  scriptId: 'script-1',
  characterId: 'character-1',
  status: 'active',
  ruleOverrides: { checkDcOverrides: {} },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
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

describe('PUT /api/characters/:id 权限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockSession(null);

    const response = await PUT(
      new Request('http://localhost/api/characters/character-1', {
        method: 'PUT',
        body: JSON.stringify(buildCharacterPayload()),
      }),
      { params: Promise.resolve({ id: 'character-1' }) },
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('未登录无法更新人物卡');
  });
});

describe('DELETE /api/characters/:id 权限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockSession(null);

    const response = await DELETE(new Request('http://localhost/api/characters/character-1'), {
      params: Promise.resolve({ id: 'character-1' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('未登录无法删除人物卡');
  });

  it('人物卡已有游戏记录返回 400', async () => {
    mockSession({ user: { id: 'user-1' } });
    vi.mocked(getDatabase).mockResolvedValue({} as D1Database);
    vi.mocked(getCharacterByIdForUser).mockResolvedValue(sampleCharacter);
    vi.mocked(getGameByCharacterId).mockResolvedValue(sampleGame);

    const response = await DELETE(
      new Request('http://localhost/api/characters/character-1', { headers: { cookie: 'auth=stub' } }),
      { params: Promise.resolve({ id: 'character-1' }) },
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('人物卡已有游戏记录，无法删除');
  });
});
