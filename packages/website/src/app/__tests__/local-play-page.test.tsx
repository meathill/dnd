import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalPlayContent } from '../local-play/local-play-page';
import { resetGameStore } from '../../lib/game/game-store';

describe('本地闭环页', () => {
  afterEach(() => {
    act(() => {
      resetGameStore();
    });
    window.localStorage.clear();
  });

  it('可以渲染核心标签和导出区域', async () => {
    render(<LocalPlayContent />);
    const user = userEvent.setup();

    expect(await screen.findByText('创建模组 + 游玩 + 导出战报')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '模组' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '角色' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '游玩' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '导出' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '导出' }));

    expect(await screen.findByText('Markdown 预览')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出 JSON' })).toBeInTheDocument();
  });
});
