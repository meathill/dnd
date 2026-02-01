import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { DELETE, GET, PUT } from '../admin/scripts/[id]/route';
import type { ScriptDefinition } from '@/lib/game/types';
import { deleteScript, getScriptById, updateScript } from '@/lib/db/repositories';
import { requireRoot } from '@/app/api/admin/admin-utils';

vi.mock('../../../lib/db/repositories', () => ({
  getScriptById: vi.fn(),
  updateScript: vi.fn(),
  deleteScript: vi.fn(),
}));

vi.mock('../admin/admin-utils', () => ({
  requireRoot: vi.fn(),
}));

function buildScript(partial?: Partial<ScriptDefinition>): ScriptDefinition {
  return {
    id: 'script-test',
    title: '测试剧本',
    summary: '测试简介',
    setting: '现代',
    difficulty: '中等',
    openingMessages: [],
    background: { overview: '', truth: '', themes: [], factions: [], locations: [], secrets: [] },
    storyArcs: [],
    enemyProfiles: [],
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
    ...partial,
  };
}

function buildContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/admin/scripts/:id', () => {
  it('未授权会直接返回', async () => {
    vi.mocked(requireRoot).mockResolvedValue(NextResponse.json({ error: '未登录' }, { status: 401 }));

    const response = await GET(new Request('http://localhost/api/admin/scripts/script-1'), buildContext('script-1'));

    expect(response.status).toBe(401);
  });

  it('找不到剧本返回 404', async () => {
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(getScriptById).mockResolvedValue(null);

    const response = await GET(new Request('http://localhost/api/admin/scripts/script-1'), buildContext('script-1'));

    expect(response.status).toBe(404);
  });

  it('返回剧本详情', async () => {
    const script = buildScript({ id: 'script-1' });
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(getScriptById).mockResolvedValue(script);

    const response = await GET(new Request('http://localhost/api/admin/scripts/script-1'), buildContext('script-1'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.script?.id).toBe('script-1');
  });
});

describe('PUT /api/admin/scripts/:id', () => {
  it('参数不合法返回 400', async () => {
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });

    const response = await PUT(
      new Request('http://localhost/api/admin/scripts/script-1', { method: 'PUT', body: JSON.stringify({}) }),
      buildContext('script-1'),
    );

    expect(response.status).toBe(400);
  });

  it('更新成功返回 script', async () => {
    const script = buildScript({ id: 'script-1', title: '更新剧本' });
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(updateScript).mockResolvedValue(script);

    const response = await PUT(
      new Request('http://localhost/api/admin/scripts/script-1', {
        method: 'PUT',
        body: JSON.stringify({
          title: '更新剧本',
          summary: '简介',
          setting: '现代',
          difficulty: '中等',
        }),
      }),
      buildContext('script-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.script?.title).toBe('更新剧本');
  });
});

describe('DELETE /api/admin/scripts/:id', () => {
  it('删除成功返回 success', async () => {
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(getScriptById).mockResolvedValue(buildScript({ id: 'script-1' }));
    vi.mocked(deleteScript).mockResolvedValue(true);

    const response = await DELETE(
      new Request('http://localhost/api/admin/scripts/script-1', { method: 'DELETE' }),
      buildContext('script-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
