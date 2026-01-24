import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SetupStage from '../setup-stage';
import { SAMPLE_SCRIPT } from '../../lib/game/sample-script';

const scripts = [SAMPLE_SCRIPT];

describe('准备阶段', () => {
  it('选择剧本会触发回调', async () => {
    const onSelectScript = vi.fn();
    render(
      <SetupStage
        scripts={scripts}
        selectedScriptId={null}
        onSelectScript={onSelectScript}
        onClearScript={vi.fn()}
        characterSummary={null}
        onCharacterComplete={vi.fn()}
        canStart={false}
        isStarting={false}
        onStartGame={vi.fn()}
        statusMessage={''}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '选择剧本' }));
    expect(onSelectScript).toHaveBeenCalledWith(SAMPLE_SCRIPT.id);
  });

  it('满足条件时开始按钮可用', () => {
    render(
      <SetupStage
        scripts={scripts}
        selectedScriptId={SAMPLE_SCRIPT.id}
        onSelectScript={vi.fn()}
        onClearScript={vi.fn()}
        characterSummary={{ name: '沈砚', occupation: '调查记者' }}
        onCharacterComplete={vi.fn()}
        canStart={true}
        isStarting={false}
        onStartGame={vi.fn()}
        statusMessage={''}
      />,
    );

    expect(screen.getByRole('button', { name: '开始游戏' })).toBeEnabled();
  });

  it('未选剧本时无法创建角色', () => {
    render(
      <SetupStage
        scripts={scripts}
        selectedScriptId={null}
        onSelectScript={vi.fn()}
        onClearScript={vi.fn()}
        characterSummary={null}
        onCharacterComplete={vi.fn()}
        canStart={false}
        isStarting={false}
        onStartGame={vi.fn()}
        statusMessage={''}
      />,
    );

    expect(screen.getByRole('button', { name: '创建角色' })).toBeDisabled();
  });

  it('已选剧本可以重新选择', async () => {
    const onClearScript = vi.fn();
    render(
      <SetupStage
        scripts={scripts}
        selectedScriptId={SAMPLE_SCRIPT.id}
        onSelectScript={vi.fn()}
        onClearScript={onClearScript}
        characterSummary={null}
        onCharacterComplete={vi.fn()}
        canStart={false}
        isStarting={false}
        onStartGame={vi.fn()}
        statusMessage={''}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '重新选择剧本' }));
    expect(onClearScript).toHaveBeenCalledTimes(1);
  });

  it('继续编辑人物卡会打开弹窗', async () => {
    render(
      <SetupStage
        scripts={scripts}
        selectedScriptId={SAMPLE_SCRIPT.id}
        onSelectScript={vi.fn()}
        onClearScript={vi.fn()}
        characterSummary={{ name: '沈砚', occupation: '调查记者' }}
        onCharacterComplete={vi.fn()}
        canStart={false}
        isStarting={false}
        onStartGame={vi.fn()}
        statusMessage={''}
      />,
    );

    expect(screen.queryByRole('button', { name: '关闭' })).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '继续编辑人物卡' }));

    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
  });
});
