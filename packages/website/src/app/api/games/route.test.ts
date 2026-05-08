import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LOCAL_RUNTIME_SESSION_ID } from '@/lib/game/runtime';

const { mockGetRequestSession, mockGetModuleById, mockGetCharacterById, mockCreateGame, mockEnsureWorkspace } =
  vi.hoisted(() => ({
    mockGetRequestSession: vi.fn(),
    mockGetModuleById: vi.fn(),
    mockGetCharacterById: vi.fn(),
    mockCreateGame: vi.fn(),
    mockEnsureWorkspace: vi.fn(),
  }));

vi.mock('@/lib/auth/session', () => ({
  getRequestSession: mockGetRequestSession,
}));

vi.mock('@/lib/db/repositories', () => ({
  createGame: mockCreateGame,
  getCharacterById: mockGetCharacterById,
  getModuleById: mockGetModuleById,
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
    mockGetRequestSession.mockResolvedValue(defaultSession);
    mockGetModuleById.mockResolvedValue(moduleRecord);
    mockGetCharacterById.mockResolvedValue(characterRecord);
    mockEnsureWorkspace.mockResolvedValue('/workspace/user-1/game-1');
    mockCreateGame.mockResolvedValue({
      id: 'game-1',
      userId: 'user-1',
      moduleId: 'module-1',
      characterId: 'character-1',
      opencodeSessionId: LOCAL_RUNTIME_SESSION_ID,
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
      gameUrl: string;
    };

    expect(response.status).toBe(201);
    expect(payload.game.id).toBe('game-1');
    expect(payload.gameUrl).toBe('/games/game-1');
    const generatedGameId = mockEnsureWorkspace.mock.calls[0]?.[1];
    expect(mockEnsureWorkspace).toHaveBeenCalledWith('user-1', generatedGameId);
    expect(mockCreateGame).toHaveBeenCalledWith(
      expect.objectContaining({
        id: generatedGameId,
        opencodeSessionId: LOCAL_RUNTIME_SESSION_ID,
        workspacePath: '/workspace/user-1/game-1',
      }),
    );
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

  it('returns 401 when user is not logged in', async () => {
    mockGetRequestSession.mockResolvedValue(null);

    const response = await POST(createRequest({ moduleId: 'module-1', characterId: 'character-1' }));
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe('未登录');
  });
});
