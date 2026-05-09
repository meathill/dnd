import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetRequestSession,
  mockResolveAdminEmails,
  mockCreateModuleDraft,
  mockListModuleDraftsForOwner,
  mockGetModuleDraftBySlug,
  mockEnsureModuleDraftWorkspace,
} = vi.hoisted(() => ({
  mockGetRequestSession: vi.fn(),
  mockResolveAdminEmails: vi.fn(),
  mockCreateModuleDraft: vi.fn(),
  mockListModuleDraftsForOwner: vi.fn(),
  mockGetModuleDraftBySlug: vi.fn(),
  mockEnsureModuleDraftWorkspace: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getRequestSession: mockGetRequestSession,
}));

vi.mock('@/lib/config/runtime', () => ({
  resolveAdminEmails: mockResolveAdminEmails,
}));

vi.mock('@/lib/db/module-drafts-repo', () => ({
  createModuleDraft: mockCreateModuleDraft,
  getModuleDraftBySlug: mockGetModuleDraftBySlug,
  listModuleDraftsForOwner: mockListModuleDraftsForOwner,
}));

vi.mock('@/lib/opencode/workspace', () => ({
  ensureModuleDraftWorkspace: mockEnsureModuleDraftWorkspace,
}));

import { GET, POST } from './route';

const editorSession = {
  userId: 'editor-1',
  displayName: 'Editor',
  email: 'editor@example.com',
  balance: 100,
  role: 'editor' as const,
  isAdmin: false,
};

const userSession = { ...editorSession, role: 'user' as const, email: 'user@example.com' };

function createRequest(body: unknown) {
  return new Request('http://localhost/api/module-drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('module-drafts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResolveAdminEmails.mockResolvedValue([]);
    mockEnsureModuleDraftWorkspace.mockResolvedValue('/workspace/modules/drafts/haunted');
    mockGetModuleDraftBySlug.mockResolvedValue(null);
    mockCreateModuleDraft.mockImplementation(async (input) => ({
      id: 'draft-1',
      slug: input.slug,
      title: input.title,
      summary: input.summary ?? '',
      setting: input.setting ?? '',
      difficulty: input.difficulty ?? '中等',
      ownerUserId: input.ownerUserId,
      meta: input.meta ?? {},
      data: {},
      workspacePath: input.workspacePath,
      status: 'draft',
      publishedModuleId: null,
      skillSet: 'authoring',
      createdAt: 't',
      updatedAt: 't',
    }));
    mockListModuleDraftsForOwner.mockResolvedValue([]);
  });

  it('rejects non-editor on POST', async () => {
    mockGetRequestSession.mockResolvedValue(userSession);
    const response = await POST(createRequest({ slug: 'haunted', title: '荒宅' }));
    expect(response.status).toBe(403);
    expect(mockCreateModuleDraft).not.toHaveBeenCalled();
  });

  it('creates draft for editor', async () => {
    mockGetRequestSession.mockResolvedValue(editorSession);
    const response = await POST(createRequest({ slug: 'haunted', title: '荒宅' }));
    expect(response.status).toBe(201);
    expect(mockEnsureModuleDraftWorkspace).toHaveBeenCalledWith('haunted');
    expect(mockCreateModuleDraft).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'haunted', title: '荒宅', ownerUserId: 'editor-1' }),
    );
  });

  it('creates draft for admin even without editor role', async () => {
    mockResolveAdminEmails.mockResolvedValue(['admin@example.com']);
    mockGetRequestSession.mockResolvedValue({ ...userSession, email: 'admin@example.com', isAdmin: true });
    const response = await POST(createRequest({ slug: 'haunted', title: '荒宅' }));
    expect(response.status).toBe(201);
  });

  it('rejects invalid slug', async () => {
    mockGetRequestSession.mockResolvedValue(editorSession);
    const response = await POST(createRequest({ slug: 'Bad Slug!', title: '荒宅' }));
    expect(response.status).toBe(400);
  });

  it('rejects duplicate slug', async () => {
    mockGetRequestSession.mockResolvedValue(editorSession);
    mockGetModuleDraftBySlug.mockResolvedValue({ id: 'existing' });
    const response = await POST(createRequest({ slug: 'haunted', title: '荒宅' }));
    expect(response.status).toBe(409);
  });

  it('lists drafts for the editor', async () => {
    mockGetRequestSession.mockResolvedValue(editorSession);
    mockListModuleDraftsForOwner.mockResolvedValue([{ id: 'd1' }]);
    const response = await GET();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { drafts: Array<{ id: string }> };
    expect(payload.drafts.map((entry) => entry.id)).toEqual(['d1']);
    expect(mockListModuleDraftsForOwner).toHaveBeenCalledWith('editor-1');
  });
});
