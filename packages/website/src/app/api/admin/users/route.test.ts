import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetRequestSession, mockListAllUsers } = vi.hoisted(() => ({
  mockGetRequestSession: vi.fn(),
  mockListAllUsers: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getRequestSession: mockGetRequestSession,
}));

vi.mock('@/lib/db/repositories', () => ({
  listAllUsers: mockListAllUsers,
}));

import { GET } from './route';

const adminSession = {
  userId: 'user-admin',
  displayName: 'Admin',
  email: 'admin@example.com',
  balance: 100,
  role: 'user' as const,
  isAdmin: true,
};

const normalSession = {
  ...adminSession,
  userId: 'user-normal',
  email: 'normal@example.com',
  isAdmin: false,
};

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListAllUsers.mockResolvedValue([
      { id: 'u1', email: 'a@x.com', name: null, role: 'user', createdAt: 1 },
      { id: 'u2', email: 'b@x.com', name: 'B', role: 'editor', createdAt: 2 },
    ]);
  });

  it('lists users for admin session', async () => {
    mockGetRequestSession.mockResolvedValue(adminSession);
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { users: Array<{ id: string }> };
    expect(payload.users.map((entry) => entry.id)).toEqual(['u1', 'u2']);
  });

  it('rejects unauthenticated', async () => {
    mockGetRequestSession.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mockListAllUsers).not.toHaveBeenCalled();
  });

  it('rejects non-admin', async () => {
    mockGetRequestSession.mockResolvedValue(normalSession);
    const response = await GET();
    expect(response.status).toBe(403);
    expect(mockListAllUsers).not.toHaveBeenCalled();
  });
});
