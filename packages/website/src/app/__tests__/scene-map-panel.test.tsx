import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SceneMapPanel from '../scene-map-panel';
import { resetGameStore, useGameStore } from '../../lib/game/game-store';

describe('环境地图面板', () => {
  afterEach(() => {
    act(() => {
      resetGameStore();
    });
    vi.restoreAllMocks();
  });

  it('支持选择历史地图版本', async () => {
    const maps = [
      {
        id: 'map-1',
        gameId: 'game-1',
        roundIndex: 1,
        content: '旧地图内容',
        createdAt: '2026-01-01T10:00:00.000Z',
      },
      {
        id: 'map-2',
        gameId: 'game-1',
        roundIndex: 2,
        content: '新地图内容',
        createdAt: '2026-01-01T10:05:00.000Z',
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ maps }),
    });
    vi.stubGlobal('fetch', fetchMock);

    act(() => {
      useGameStore.setState({ activeGameId: 'game-1', mapText: '当前地图' });
    });

    render(<SceneMapPanel />);

    expect(await screen.findByText('当前地图')).toBeInTheDocument();

    const user = userEvent.setup();
    const trigger = await screen.findByLabelText('地图版本');
    await user.click(trigger);
    await user.click(await screen.findByText(/回合 1/));

    expect(await screen.findByText('旧地图内容')).toBeInTheDocument();
  });
});
