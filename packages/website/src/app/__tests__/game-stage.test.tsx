import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GameStage from '../game-stage';
import type { ScriptDefinition } from '../../lib/game/types';
import { resetGameStore, useGameStore } from '../../lib/game/game-store';

const originalFetch = global.fetch;

const sampleScript: ScriptDefinition = {
  id: 'script-open',
  title: '开场测试',
  summary: '测试剧本开场对白。',
  setting: '现代',
  difficulty: '低',
  openingMessages: [
    {
      role: 'system',
      content: '这是开场对白。',
    },
  ],
  skillOptions: [],
  equipmentOptions: [],
  occupationOptions: [],
  originOptions: [],
  buffOptions: [],
  debuffOptions: [],
  attributeRanges: {},
  attributePointBudget: 0,
  skillLimit: 0,
  equipmentLimit: 0,
  buffLimit: 0,
  debuffLimit: 0,
  rules: {},
  scenes: [],
  encounters: [],
};

describe('GameStage', () => {
  beforeEach(() => {
    resetGameStore();
    useGameStore.setState({ activeGameId: 'game-1' });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('会使用剧本开场对白', () => {
    render(<GameStage script={sampleScript} />);

    expect(screen.getByText('这是开场对白。')).toBeInTheDocument();
  });

  it('发送指令会请求 AI 并展示回复', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ text: 'AI 回复' }),
      } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<GameStage script={sampleScript} />);

    const input = screen.getByPlaceholderText('描述你要说的话或采取的行动，肉团长会结合规则做出回应。');
    await user.type(input, '测试指令');
    await user.click(screen.getByRole('button', { name: '发送指令' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const payload = JSON.parse(String(requestInit.body));
    expect(payload).toMatchObject({ gameId: 'game-1', input: '测试指令' });

    expect(await screen.findByText('AI 回复')).toBeInTheDocument();
  });

  it('会展示模块化输出内容', () => {
    render(
      <GameStage
        script={sampleScript}
        initialMessages={[
          {
            id: 'msg-1',
            role: 'dm',
            speaker: '肉团长',
            time: '10:00',
            content: '叙事内容',
            modules: [
              { type: 'narrative', content: '叙事内容' },
              { type: 'dice', content: '侦查 1D100 → 22 / 60，成功。' },
              { type: 'suggestions', items: ['继续搜索', '询问同伴'] },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('掷骰结果')).toBeInTheDocument();
    expect(screen.getByText('侦查 1D100 → 22 / 60，成功。')).toBeInTheDocument();
    expect(screen.getByText('行动建议')).toBeInTheDocument();
    expect(screen.getByText('继续搜索')).toBeInTheDocument();
  });
});
