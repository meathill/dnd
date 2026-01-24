import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ScriptDetailStage from '../script-detail-stage';
import { SAMPLE_SCRIPT } from '../../lib/game/sample-script';

describe('剧本详情', () => {
  it('未建卡时无法开始游戏', () => {
    render(
      <ScriptDetailStage
        script={SAMPLE_SCRIPT}
        characterSummary={null}
        onBack={vi.fn()}
        onStartGame={vi.fn()}
        isStarting={false}
        statusMessage=""
      >
        <div>建卡区域</div>
      </ScriptDetailStage>,
    );

    expect(screen.getByRole('button', { name: '开始游戏' })).toBeDisabled();
  });

  it('完成建卡后可以开始游戏', async () => {
    const onStartGame = vi.fn();
    render(
      <ScriptDetailStage
        script={SAMPLE_SCRIPT}
        characterSummary={{ name: '沈砚', occupation: '调查记者' }}
        onBack={vi.fn()}
        onStartGame={onStartGame}
        isStarting={false}
        statusMessage=""
      >
        <div>建卡区域</div>
      </ScriptDetailStage>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '开始游戏' }));

    expect(onStartGame).toHaveBeenCalledTimes(1);
  });

  it('点击返回首页触发回调', async () => {
    const onBack = vi.fn();
    render(
      <ScriptDetailStage
        script={SAMPLE_SCRIPT}
        characterSummary={null}
        onBack={onBack}
        onStartGame={vi.fn()}
        isStarting={false}
        statusMessage=""
      >
        <div>建卡区域</div>
      </ScriptDetailStage>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '返回首页' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
