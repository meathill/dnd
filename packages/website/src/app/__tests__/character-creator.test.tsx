import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CharacterCreator from '../character-creator';

describe('人物卡创建', () => {
  it('点击创建角色会显示流程弹窗', async () => {
    render(<CharacterCreator />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));

    expect(screen.getByText('创建人物卡')).toBeInTheDocument();
  });

  it('完成创建会触发回调', async () => {
    const onComplete = vi.fn().mockResolvedValue({ ok: true });
    render(
      <CharacterCreator onComplete={onComplete} rules={{ skillAllocationMode: 'selection', skillPointBudget: 0 }} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole('button', { name: '下一步' }));
    }

    const createButtons = screen.getAllByRole('button', { name: '创建角色' });
    await user.click(createButtons[createButtons.length - 1]);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]?.[0]?.name).toBe('沈砚');
  });

  it('提交失败会显示字段级错误并保持弹窗', async () => {
    const onComplete = vi.fn().mockResolvedValue({
      ok: false,
      fieldErrors: { occupation: '人物卡职业不在剧本允许范围内' },
      message: '人物卡字段不合法',
    });
    render(
      <CharacterCreator onComplete={onComplete} rules={{ skillAllocationMode: 'selection', skillPointBudget: 0 }} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole('button', { name: '下一步' }));
    }

    const createButtons = screen.getAllByRole('button', { name: '创建角色' });
    await user.click(createButtons[createButtons.length - 1]);

    expect(await screen.findByText('人物卡字段不合法')).toBeInTheDocument();
    expect(await screen.findByText('人物卡职业不在剧本允许范围内')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '关闭' })).toBeInTheDocument();
  });

  it('传入剧本选项会显示职业与来源下拉', async () => {
    render(
      <CharacterCreator
        occupationOptions={['神父', '警探']}
        originOptions={['松柏镇', '河口镇']}
        skillOptions={[{ id: 'occult', label: '神秘学', group: '学识' }]}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));

    const occupationTrigger = screen.getByRole('combobox', { name: '职业' });
    expect(occupationTrigger).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '出身' })).toBeInTheDocument();

    await user.click(occupationTrigger);
    expect(await screen.findByRole('option', { name: '神父' })).toBeInTheDocument();
  });

  it('属性点预算不足会提示错误', async () => {
    render(<CharacterCreator attributePointBudget={200} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const attributeInputs = screen.getAllByRole('spinbutton');
    await user.clear(attributeInputs[0] as HTMLInputElement);
    await user.type(attributeInputs[0] as HTMLInputElement, '90');

    const nextButton = screen.getByRole('button', { name: '下一步' });
    expect(nextButton).toBeDisabled();
    expect(screen.getByText('属性点总和超出上限 200')).toBeInTheDocument();
  });

  it('技能点数超预算会禁用下一步', async () => {
    render(
      <CharacterCreator
        skillOptions={[{ id: 'spotHidden', label: '侦查', group: '调查' }]}
        rules={{ skillAllocationMode: 'budget', skillPointBudget: 10, skillMaxValue: 60 }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const skillInput = screen.getByLabelText('侦查技能值');
    await user.clear(skillInput);
    await user.type(skillInput, '40');

    const nextButton = screen.getByRole('button', { name: '下一步' });
    expect(nextButton).toBeDisabled();
    expect(screen.getByText('技能点数超出预算 10')).toBeInTheDocument();
  });

  it('quick-start 需要分配核心与兴趣技能', async () => {
    render(
      <CharacterCreator
        skillOptions={[
          { id: 'spotHidden', label: '侦查', group: '调查' },
          { id: 'listen', label: '聆听', group: '调查' },
          { id: 'stealth', label: '潜行', group: '行动' },
        ]}
        rules={{
          skillAllocationMode: 'quickstart',
          quickstartCoreValues: [70, 60],
          quickstartInterestCount: 1,
          quickstartInterestBonus: 20,
        }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const nextButton = screen.getByRole('button', { name: '下一步' });
    expect(nextButton).toBeDisabled();

    const spotSelect = screen.getByRole('combobox', { name: '侦查核心值' });
    await user.click(spotSelect);
    await user.click(await screen.findByRole('option', { name: '70' }));

    const listenSelect = screen.getByRole('combobox', { name: '聆听核心值' });
    await user.click(listenSelect);
    await user.click(await screen.findByRole('option', { name: '60' }));

    const interestSection = screen.getByText('兴趣技能').closest('div');
    expect(interestSection).toBeTruthy();
    await user.click(within(interestSection as HTMLElement).getByText('潜行'));

    expect(nextButton).toBeEnabled();
  });

  it('低于规则推荐最低值会显示提示', async () => {
    render(<CharacterCreator attributeRanges={{ strength: { min: 5, max: 90 } }} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const attributeInputs = screen.getAllByRole('spinbutton');
    await user.clear(attributeInputs[0] as HTMLInputElement);

    expect(await screen.findByText('低于规则推荐最低值 15')).toBeInTheDocument();
  });

  it('buff/debuff 限制为 1 时会自动替换选中项', async () => {
    render(
      <CharacterCreator
        buffOptions={['灵感加持', '冷静分析']}
        debuffOptions={['轻微受伤', '噩梦缠身']}
        buffLimit={1}
        debuffLimit={1}
        rules={{ skillAllocationMode: 'selection', skillPointBudget: 0 }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const buffA = screen.getByRole('button', { name: '灵感加持' });
    const buffB = screen.getByRole('button', { name: '冷静分析' });
    await user.click(buffA);
    await user.click(buffB);
    expect(buffB).toHaveClass('bg-[rgba(61,82,56,0.16)]');
    expect(buffA).not.toHaveClass('bg-[rgba(61,82,56,0.16)]');

    const debuffA = screen.getByRole('button', { name: '轻微受伤' });
    const debuffB = screen.getByRole('button', { name: '噩梦缠身' });
    await user.click(debuffA);
    await user.click(debuffB);
    expect(debuffB).toHaveClass('bg-[rgba(176,74,53,0.16)]');
    expect(debuffA).not.toHaveClass('bg-[rgba(176,74,53,0.16)]');
  });

  it('属性与状态有 tooltip 说明', async () => {
    render(
      <CharacterCreator
        buffOptions={['灵感加持']}
        debuffOptions={['轻微受伤']}
        debuffLimit={1}
        rules={{ skillAllocationMode: 'selection', skillPointBudget: 0 }}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const strengthLabel = screen.getByText('力量');
    expect(strengthLabel).toHaveAttribute('title');

    await user.click(screen.getByRole('button', { name: '下一步' }));
    await user.click(screen.getByRole('button', { name: '下一步' }));

    const buffButton = screen.getByRole('button', { name: '灵感加持' });
    const debuffButton = screen.getByRole('button', { name: '轻微受伤' });
    expect(buffButton).toHaveAttribute('title');
    expect(debuffButton).toHaveAttribute('title');
  });

  it('未登录时点击创建角色会请求登录流程', async () => {
    const onRequestOpen = vi.fn();
    render(<CharacterCreator isDisabled onRequestOpen={onRequestOpen} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '创建角色' }));

    expect(onRequestOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('创建人物卡')).not.toBeInTheDocument();
  });
});
