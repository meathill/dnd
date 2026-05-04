import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockReadFile,
  mockGetRequestSession,
  mockGetModuleById,
  mockGetCharacterById,
  mockCreateGame,
  mockCreateGameplaySession,
  mockEnsureWorkspace,
} = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockGetRequestSession: vi.fn(),
  mockGetModuleById: vi.fn(),
  mockGetCharacterById: vi.fn(),
  mockCreateGame: vi.fn(),
  mockCreateGameplaySession: vi.fn(),
  mockEnsureWorkspace: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: mockReadFile,
  };
});

vi.mock('@/lib/auth/session', () => ({
  getRequestSession: mockGetRequestSession,
}));

vi.mock('@/lib/db/repositories', () => ({
  createGame: mockCreateGame,
  getCharacterById: mockGetCharacterById,
  getModuleById: mockGetModuleById,
}));

vi.mock('@/lib/opencode/gameplay', () => ({
  createGameplaySession: mockCreateGameplaySession,
}));

vi.mock('@/lib/opencode/workspace', () => ({
  ensureWorkspace: mockEnsureWorkspace,
}));

import { POST } from './route';

const defaultSession = {
  userId: 'user-1',
  displayName: 'Smoke',
  email: 'smoke@example.com',
  balance: 100,
};

const moduleRecord = {
  id: 'module-1',
  title: '破门驱邪',
  summary: 'summary',
  setting: 'setting',
  difficulty: '中等',
  data: {},
};

const characterRecord = {
  id: 'character-1',
  moduleId: 'module-1',
  name: '林雾',
  summary: 'summary',
  data: {},
};

function createRequest(body: unknown) {
  return new Request('http://localhost/api/games', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/games', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLAY_BASE_URL;
    mockReadFile.mockResolvedValue('system prompt');
    mockGetRequestSession.mockResolvedValue(defaultSession);
    mockGetModuleById.mockResolvedValue(moduleRecord);
    mockGetCharacterById.mockResolvedValue(characterRecord);
    mockEnsureWorkspace.mockResolvedValue('/workspace/user-1/game-1');
    mockCreateGameplaySession.mockResolvedValue({ id: 'session-1' });
    mockCreateGame.mockResolvedValue({
      id: 'game-1',
      userId: 'user-1',
      moduleId: 'module-1',
      characterId: 'character-1',
      opencodeSessionId: 'session-1',
      workspacePath: '/workspace/user-1/game-1',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('creates game and returns local play url by default', async () => {
    const response = await POST(createRequest({ moduleId: 'module-1', characterId: 'character-1' }));
    const payload = (await response.json()) as {
      game: { id: string };
      playUrl: string;
    };

    expect(response.status).toBe(201);
    expect(payload.game.id).toBe('game-1');
    expect(payload.playUrl).toBe('/games/game-1');
    const generatedGameId = mockEnsureWorkspace.mock.calls[0]?.[1];
    expect(mockEnsureWorkspace).toHaveBeenCalledWith('user-1', generatedGameId);
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: generatedGameId,
        workspacePath: '/workspace/user-1/game-1',
      }),
    );
  });

  it('returns external play url when play domain is configured', async () => {
    process.env.PLAY_BASE_URL = 'https://play.muirpg.com';

    const response = await POST(createRequest({ moduleId: 'module-1', characterId: 'character-1' }));
    const payload = (await response.json()) as { playUrl: string };

    expect(response.status).toBe(201);
    expect(payload.playUrl).toBe('https://play.muirpg.com/game-1');
  });

  it('rejects character from another module', async () => {
    mockGetCharacterById.mockResolvedValue({
      ...characterRecord,
      moduleId: 'module-2',
    });

    const response = await POST(createRequest({ moduleId: 'module-1', characterId: 'character-1' }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('人物卡不属于该模组');
    expect(mockEnsureWorkspace).not.toHaveBeenCalled();
  });

  it('returns 502 when opencode session creation fails', async () => {
    mockCreateGameplaySession.mockRejectedValue(new Error('upstream unavailable'));

    const response = await POST(createRequest({ moduleId: 'module-1', characterId: 'character-1' }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(502);
    expect(payload.error).toBe('游戏服务暂不可用，请稍后重试');
    expect(mockCreateGame).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not logged in', async () => {
    mockGetRequestSession.mockResolvedValue(null);

    const response = await POST(createRequest({ moduleId: 'module-1', characterId: 'character-1' }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe('未登录');
  });
});
