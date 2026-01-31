import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DmMemoryPanel from '../dm-memory-panel';
import { SessionProvider } from '../../lib/session/session-context';
import { resetGameStore, useGameStore } from '../../lib/game/game-store';
import type { GameMemoryRecord } from '../../lib/game/types';
import type { ReactNode } from 'react';

const sessionValue = {
  session: {
    userId: 'root-user',
    displayName: 'Root',
    settings: null,
    isRoot: true,
  },
  reloadSession: async () => null,
  requestAuth: () => {},
};

function renderWithSession(node: ReactNode) {
  return render(<SessionProvider value={sessionValue}>{node}</SessionProvider>);
}

describe('DM 记忆面板', () => {
  afterEach(() => {
    act(() => {
      resetGameStore();
    });
    vi.restoreAllMocks();
  });

  it('支持筛选隐藏指定内容区块', async () => {
    const memory: GameMemoryRecord = {
      id: 'memory-1',
      gameId: 'game-1',
      lastRoundIndex: 2,
      lastProcessedAt: '2026-01-01T10:00:00.000Z',
      shortSummary: '短摘要内容',
      longSummary: '长期摘要内容',
      recentRounds: [{ round: 1, summary: '第一回合摘要' }],
      state: {
        allies: [],
        npcs: [],
        locations: [],
        threads: [],
        flags: [],
        notes: [],
        dmNotes: [],
        vitals: {},
        presence: { presentNpcs: [] },
        mapText: '地图内容',
      },
      createdAt: '2026-01-01T09:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        memory,
        character: { id: 'char-1', name: '测试角色' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      useGameStore.setState({ activeGameId: 'game-1' });
    });

    renderWithSession(<DmMemoryPanel />);

    expect(await screen.findByText('短摘要内容')).toBeInTheDocument();

    const user = userEvent.setup();
    const shortSummaryToggle = await screen.findByLabelText('短摘要', { selector: 'input' });
    await user.click(shortSummaryToggle);

    expect(screen.queryByText('短摘要内容')).not.toBeInTheDocument();
  });
});
