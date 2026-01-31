import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { GET, POST } from '../admin/dm-profiles/route';
import type { DmProfileSummary } from '../../../lib/game/types';
import { createDmProfile, listDmProfiles } from '../../../lib/db/repositories';
import { requireRoot } from '../admin/admin-utils';

vi.mock('../../../lib/db/repositories', () => ({
  listDmProfiles: vi.fn(),
  createDmProfile: vi.fn(),
}));

vi.mock('../admin/admin-utils', () => ({
  requireRoot: vi.fn(),
}));

describe('GET /api/admin/dm-profiles', () => {
  it('未授权会直接返回', async () => {
    vi.mocked(requireRoot).mockResolvedValue(NextResponse.json({ error: '未登录' }, { status: 401 }));

    const response = await GET(new Request('http://localhost/api/admin/dm-profiles'));

    expect(response.status).toBe(401);
  });

  it('返回 DM 风格列表', async () => {
    const profiles: DmProfileSummary[] = [
      { id: 'dm-default', name: '温和推进', summary: '偏向剧情推进', isDefault: true },
    ];
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(listDmProfiles).mockResolvedValue(profiles);

    const response = await GET(new Request('http://localhost/api/admin/dm-profiles'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profiles).toEqual(profiles);
  });
});

describe('POST /api/admin/dm-profiles', () => {
  it('参数不合法返回 400', async () => {
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });

    const response = await POST(
      new Request('http://localhost/api/admin/dm-profiles', { method: 'POST', body: JSON.stringify({}) }),
    );

    expect(response.status).toBe(400);
  });

  it('创建成功返回 profile', async () => {
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(createDmProfile).mockResolvedValue({
      id: 'dm-1',
      name: '高速推进',
      summary: '节奏更快',
      analysisGuide: '',
      narrationGuide: '',
      isDefault: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const response = await POST(
      new Request('http://localhost/api/admin/dm-profiles', {
        method: 'POST',
        body: JSON.stringify({ name: '高速推进', summary: '节奏更快' }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profile?.id).toBe('dm-1');
  });
});
