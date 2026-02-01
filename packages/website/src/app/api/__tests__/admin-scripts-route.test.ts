import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { GET, POST } from '../admin/scripts/route';
import type { ScriptDefinition } from '@/lib/game/types';
import { createScript, getScriptById, listScripts } from '@/lib/db/repositories';
import { requireRoot } from '@/app/api/admin/admin-utils';

vi.mock('../../../lib/db/repositories', () => ({
  listScripts: vi.fn(),
  getScriptById: vi.fn(),
  createScript: vi.fn(),
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

describe('GET /api/admin/scripts', () => {
  it('未授权会直接返回', async () => {
    vi.mocked(requireRoot).mockResolvedValue(NextResponse.json({ error: '未登录' }, { status: 401 }));

    const response = await GET(new Request('http://localhost/api/admin/scripts'));

    expect(response.status).toBe(401);
  });

  it('返回剧本列表', async () => {
    const scripts = [buildScript({ id: 'script-1' })];
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(listScripts).mockResolvedValue(scripts);

    const response = await GET(new Request('http://localhost/api/admin/scripts'));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.scripts).toEqual(scripts);
  });
});

describe('POST /api/admin/scripts', () => {
  it('参数不合法返回 400', async () => {
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });

    const response = await POST(
      new Request('http://localhost/api/admin/scripts', { method: 'POST', body: JSON.stringify({}) }),
    );

    expect(response.status).toBe(400);
  });

  it('创建成功返回 script', async () => {
    const script = buildScript({ id: 'script-new', title: '新剧本' });
    vi.mocked(requireRoot).mockResolvedValue({ db: {} as D1Database, userId: 'user-1' });
    vi.mocked(getScriptById).mockResolvedValue(null);
    vi.mocked(createScript).mockResolvedValue(script);

    const response = await POST(
      new Request('http://localhost/api/admin/scripts', {
        method: 'POST',
        body: JSON.stringify({
          id: 'script-new',
          title: '新剧本',
          summary: '简介',
          setting: '现代',
          difficulty: '中等',
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.script?.id).toBe('script-new');
  });
});
