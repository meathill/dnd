import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import HomeStage from '../home-stage';
import { SAMPLE_SCRIPT } from '../../lib/game/sample-script';
import type { GameRecordSummary } from '../../lib/game/types';

describe('首页流程', () => {
  it('点击剧本卡会触发回调', async () => {
    const onSelectScript = vi.fn();
    render(<HomeStage scripts={[SAMPLE_SCRIPT]} games={[]} onSelectScript={onSelectScript} onContinueGame={vi.fn()} />);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '查看剧本' }));

    expect(onSelectScript).toHaveBeenCalledWith(SAMPLE_SCRIPT.id);
  });

  it('有游戏记录时可继续游戏', async () => {
    const onContinueGame = vi.fn();
    const games: GameRecordSummary[] = [
      {
        id: 'game-1',
        scriptId: SAMPLE_SCRIPT.id,
        scriptTitle: SAMPLE_SCRIPT.title,
        characterId: 'char-1',
        characterName: '沈砚',
        status: 'active',
        updatedAt: '2024-01-01T12:00:00.000Z',
      },
    ];

    render(
      <HomeStage scripts={[SAMPLE_SCRIPT]} games={games} onSelectScript={vi.fn()} onContinueGame={onContinueGame} />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '继续游戏' }));

    expect(onContinueGame).toHaveBeenCalledWith('game-1');
  });

  it('没有游戏记录时显示提示', () => {
    render(<HomeStage scripts={[SAMPLE_SCRIPT]} games={[]} onSelectScript={vi.fn()} onContinueGame={vi.fn()} />);

    expect(screen.getByText('暂无游戏记录')).toBeInTheDocument();
  });
});
