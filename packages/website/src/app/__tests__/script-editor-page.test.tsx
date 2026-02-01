import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';
import type { ScriptDefinition } from '../../lib/game/types';
import { SessionProvider } from '../../lib/session/session-context';
import type { SessionInfo } from '../../lib/session/session-types';
import { ScriptEditorContent } from '../admin/scripts/[id]/script-editor-page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const originalFetch = global.fetch;

function createResponse(data: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => data,
  } as Response;
}

function renderWithSession(node: ReactNode, session: SessionInfo | null) {
  return render(
    <SessionProvider value={{ session, reloadSession: async () => null, requestAuth: vi.fn() }}>
      {node}
    </SessionProvider>,
  );
}

const sampleScript: ScriptDefinition = {
  id: 'script-ally',
  title: '友方测试',
  summary: '用于验证 NPC 表单。',
  setting: '现代',
  difficulty: '低',
  openingMessages: [],
  background: { overview: '', truth: '', themes: [], factions: [], locations: [], secrets: [] },
  storyArcs: [],
  npcProfiles: [
    {
      id: 'npc-1',
      name: '苏瑾',
      type: '灵媒学徒',
      role: 'ally',
      threat: '低',
      summary: '会在关键时刻协助玩家。',
      useWhen: '玩家陷入困境或需要额外线索时出现。',
      status: '轻伤，但保持清醒。',
      hp: 12,
      armor: 0,
      move: 8,
      attacks: [],
      skills: [],
      traits: [],
      tactics: '',
      weakness: '',
      sanityLoss: '',
    },
  ],
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

describe('剧本编辑器', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('展示 NPC 友方信息、使用时机与状态', async () => {
    const fetchMock = vi.fn(async () => createResponse({ script: sampleScript }));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession(<ScriptEditorContent scriptId="script-ally" />, {
      userId: 'root',
      displayName: 'Root',
      settings: null,
      isRoot: true,
    });

    expect(await screen.findByDisplayValue('苏瑾')).toBeInTheDocument();
    expect(screen.getByDisplayValue('玩家陷入困境或需要额外线索时出现。')).toBeInTheDocument();
    expect(screen.getByDisplayValue('轻伤，但保持清醒。')).toBeInTheDocument();
  });

  it('渲染侧边栏导航入口', async () => {
    const fetchMock = vi.fn(async () => createResponse({ script: sampleScript }));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession(<ScriptEditorContent scriptId="script-ally" />, {
      userId: 'root',
      displayName: 'Root',
      settings: null,
      isRoot: true,
    });

    expect(await screen.findByRole('link', { name: 'NPC 档案' })).toBeInTheDocument();
  });
});
