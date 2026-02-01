import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../dm-profiles/route';
import type { DmProfileSummary } from '@/lib/game/types';
import { getDatabase } from '@/lib/db/db';
import { listDmProfiles } from '@/lib/db/repositories';

vi.mock('../../../lib/db/db', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('../../../lib/db/repositories', () => ({
  listDmProfiles: vi.fn(),
}));

describe('GET /api/dm-profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('返回 DM 风格列表', async () => {
    const profiles: DmProfileSummary[] = [
      { id: 'dm-default', name: '温和推进', summary: '偏向剧情推进', isDefault: true },
    ];
    vi.mocked(getDatabase).mockResolvedValue({} as D1Database);
    vi.mocked(listDmProfiles).mockResolvedValue(profiles);

    const response = await GET(new Request('http://localhost/api/dm-profiles'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.profiles).toEqual(profiles);
  });
});
