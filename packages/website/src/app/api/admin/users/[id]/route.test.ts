import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetRequestSession, mockGetUserById, mockUpdateUserRole } = vi.hoisted(() => ({
  mockGetRequestSession: vi.fn(),
  mockGetUserById: vi.fn(),
  mockUpdateUserRole: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getRequestSession: mockGetRequestSession,
}));

vi.mock('@/lib/db/repositories', () => ({
  getUserById: mockGetUserById,
  updateUserRole: mockUpdateUserRole,
}));

import { PATCH } from './route';

const adminSession = {
  userId: 'admin-1',
  displayName: 'Admin',
  email: 'admin@example.com',
  balance: 100,
  role: 'user' as const,
  isAdmin: true,
};

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/users/u1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRequestSession.mockResolvedValue(adminSession);
    mockGetUserById.mockResolvedValue({ id: 'u1', email: 'a@x.com', name: null, role: 'user', createdAt: 1 });
    mockUpdateUserRole.mockImplementation(async (id: string, role: 'user' | 'editor') => ({
      id,
      email: 'a@x.com',
      name: null,
      role,
      createdAt: 1,
    }));
  });

  it('updates role to editor', async () => {
    const response = await PATCH(makeRequest({ role: 'editor' }), makeContext('u1'));
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { user: { role: string } };
    expect(payload.user.role).toBe('editor');
    expect(mockUpdateUserRole).toHaveBeenCalledWith('u1', 'editor');
  });

  it('rejects non-admin', async () => {
    mockGetRequestSession.mockResolvedValue({ ...adminSession, isAdmin: false });
    const response = await PATCH(makeRequest({ role: 'editor' }), makeContext('u1'));
    expect(response.status).toBe(403);
    expect(mockUpdateUserRole).not.toHaveBeenCalled();
  });

  it('rejects unknown role value', async () => {
    const response = await PATCH(makeRequest({ role: 'super-admin' }), makeContext('u1'));
    expect(response.status).toBe(400);
    expect(mockUpdateUserRole).not.toHaveBeenCalled();
  });

  it('returns 404 for missing target', async () => {
    mockGetUserById.mockResolvedValue(null);
    const response = await PATCH(makeRequest({ role: 'editor' }), makeContext('missing'));
    expect(response.status).toBe(404);
    expect(mockUpdateUserRole).not.toHaveBeenCalled();
  });
});
