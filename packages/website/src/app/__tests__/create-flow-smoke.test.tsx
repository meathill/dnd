import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import CharacterCreator from '../character-creator';
import type { FormState } from '../character-creator-data';
import ScriptDetailStage from '../script-detail-stage';
import { SAMPLE_SCRIPT } from '../../lib/game/sample-script';

type CharacterSummary = { name: string; occupation: string } | null;

type FlowHarnessProps = {
  onStartGame: () => void;
};

function FlowHarness({ onStartGame }: FlowHarnessProps) {
  const [summary, setSummary] = useState<CharacterSummary>(null);

  async function handleComplete(formState: FormState) {
    setSummary({ name: formState.name, occupation: formState.occupation });
    return { ok: true };
  }

  return (
    <ScriptDetailStage
      script={SAMPLE_SCRIPT}
      characterSummary={summary}
      onBack={vi.fn()}
      onStartGame={onStartGame}
      isStarting={false}
      statusMessage=""
    >
      <CharacterCreator
        onComplete={handleComplete}
        skillOptions={SAMPLE_SCRIPT.skillOptions}
        equipmentOptions={SAMPLE_SCRIPT.equipmentOptions}
        occupationOptions={SAMPLE_SCRIPT.occupationOptions}
        originOptions={SAMPLE_SCRIPT.originOptions}
        buffOptions={SAMPLE_SCRIPT.buffOptions}
        debuffOptions={SAMPLE_SCRIPT.debuffOptions}
        attributeRanges={SAMPLE_SCRIPT.attributeRanges}
        attributePointBudget={SAMPLE_SCRIPT.attributePointBudget}
        skillLimit={SAMPLE_SCRIPT.skillLimit}
        equipmentLimit={SAMPLE_SCRIPT.equipmentLimit}
        buffLimit={SAMPLE_SCRIPT.buffLimit}
        debuffLimit={SAMPLE_SCRIPT.debuffLimit}
      />
    </ScriptDetailStage>
  );
}

describe('创建流程走查', () => {
  it('可以完成建卡并进入游戏', async () => {
    const onStartGame = vi.fn();
    render(<FlowHarness onStartGame={onStartGame} />);
    const user = userEvent.setup();

    const startButton = screen.getByRole('button', { name: '开始游戏' });
    expect(startButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '创建角色' }));

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole('button', { name: '下一步' }));
    }

    const createButtons = screen.getAllByRole('button', { name: '创建角色' });
    await user.click(createButtons[createButtons.length - 1]);

    expect(await screen.findByText('已创建：')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '开始游戏' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '开始游戏' }));
    expect(onStartGame).toHaveBeenCalledTimes(1);
  });
});
