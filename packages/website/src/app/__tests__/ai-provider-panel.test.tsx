import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AiProviderPanel from '../ai-provider-panel';

describe('AI 模型配置', () => {
  it('默认使用 OpenAI gpt-5-mini', () => {
    render(<AiProviderPanel />);
    expect(screen.getByText('当前使用：gpt-5-mini')).toBeInTheDocument();
  });

  it('切换到 Gemini 会更新默认模型', async () => {
    render(<AiProviderPanel />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('combobox', { name: 'Provider' }));
    const geminiOption = await screen.findByRole('option', { name: 'Google Gemini' });
    await user.click(geminiOption);

    expect(screen.getByText('当前使用：gemini-3-flash-preview')).toBeInTheDocument();
  });

  it('输入自定义模型会覆盖默认展示', async () => {
    render(<AiProviderPanel />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('自定义模型（可选）'), 'gpt-4.1-mini');

    expect(screen.getByText('当前使用：gpt-4.1-mini')).toBeInTheDocument();
  });

  it('清空自定义模型会回退到默认模型', async () => {
    render(<AiProviderPanel />);
    const user = userEvent.setup();
    const modelInput = screen.getByLabelText('自定义模型（可选）');

    await user.type(modelInput, 'gpt-4.1-mini');
    await user.clear(modelInput);

    expect(screen.getByText('当前使用：gpt-5-mini')).toBeInTheDocument();
  });

  it('切换提供方但已有自定义模型时保持自定义值', async () => {
    render(<AiProviderPanel />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('自定义模型（可选）'), 'my-fast-model');
    await user.click(screen.getByRole('combobox', { name: 'Provider' }));
    const geminiOption = await screen.findByRole('option', { name: 'Google Gemini' });
    await user.click(geminiOption);

    expect(screen.getByText('当前使用：my-fast-model')).toBeInTheDocument();
  });
});
