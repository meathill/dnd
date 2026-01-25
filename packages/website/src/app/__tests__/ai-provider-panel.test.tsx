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
});
