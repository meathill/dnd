import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../games/route';
import type { CharacterRecord, ScriptDefinition } from '../../../lib/game/types';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import { createGame, getCharacterByIdForUser, getScriptById, listGamesByUser } from '../../../lib/db/repositories';

vi.mock('../../../lib/auth/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('../../../lib/db/db', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../../lib/db/repositories', () => ({
  createGame: vi.fn(),
  getCharacterByIdForUser: vi.fn(),
  getScriptById: vi.fn(),
  listGamesByUser: vi.fn(),
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

const sampleScript: ScriptDefinition = {
  id: 'script-1',
  title: '测试剧本',
  summary: '测试',
  setting: '现代',
  difficulty: '低',
  openingMessages: [],
  skillOptions: [],
  equipmentOptions: [],
  occupationOptions: [],
  originOptions: [],
  buffOptions: [],
  debuffOptions: [],
  attributeRanges: {},
  attributePointBudget: 0,
  skillLimit: 0,
  equipmentLimit: 0,
  buffLimit: 0,
  debuffLimit: 0,
  rules: {},
  scenes: [],
  encounters: [],
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

function mockSession(session: AuthSession | null) {
  const authClient: AuthClient = {
    api: {
      getSession: vi.fn().mockResolvedValue(session),
    },
  };
  vi.mocked(getAuth).mockResolvedValue(authClient);
}

function buildGamePayload() {
  return {
    scriptId: 'script-1',
    characterId: 'character-1',
  };
}

describe('GET /api/games 权限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockSession(null);

    const response = await GET(new Request('http://localhost/api/games'));

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('未登录无法读取游戏记录');
  });
});

describe('POST /api/games 权限', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录返回 401', async () => {
    mockSession(null);

    const response = await POST(
      new Request('http://localhost/api/games', {
        method: 'POST',
        body: JSON.stringify(buildGamePayload()),
      }),
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('未登录无法创建游戏');
  });

  it('人物卡不属于当前用户返回 404', async () => {
    mockSession({ user: { id: 'user-1' } });
    vi.mocked(getDatabase).mockResolvedValue({} as D1Database);
    vi.mocked(getScriptById).mockResolvedValue(sampleScript);
    vi.mocked(getCharacterByIdForUser).mockResolvedValue(null);
    vi.mocked(createGame).mockResolvedValue({
      id: 'game-1',
      scriptId: sampleScript.id,
      characterId: sampleCharacter.id,
      status: 'active',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/games', {
        method: 'POST',
        headers: { cookie: 'auth=stub' },
        body: JSON.stringify(buildGamePayload()),
      }),
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('脚本或人物卡不存在');
  });
});
