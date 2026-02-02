import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import GameStage from '../game-stage';
import type { ScriptDefinition } from '../../lib/game/types';
import { resetGameStore, useGameStore } from '../../lib/game/game-store';
import { SessionProvider } from '../../lib/session/session-context';
import type { ReactElement } from 'react';

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
  background: {
    overview: '',
    truth: '',
    themes: [],
    factions: [],
    locations: [],
    explorableAreas: [],
    secrets: [],
  },
  storyArcs: [],
  npcProfiles: [],
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

const sessionValue = {
  session: null,
  reloadSession: async () => null,
  requestAuth: vi.fn(),
};

function renderWithSession(node: ReactElement) {
  return render(<SessionProvider value={sessionValue}>{node}</SessionProvider>);
}

describe('GameStage', () => {
  beforeEach(() => {
    resetGameStore();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('会使用剧本开场对白', () => {
    renderWithSession(<GameStage script={sampleScript} />);

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
    useGameStore.setState({ activeGameId: 'game-1' });
    renderWithSession(<GameStage script={sampleScript} />);

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
    const chatCall = fetchMock.mock.calls.find((call) => call[0] === '/api/chat');
    expect(chatCall).toBeDefined();
    const requestInit = chatCall?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(requestInit?.body ?? '{}'));
    expect(payload).toMatchObject({ gameId: 'game-1', input: '测试指令' });
    expect(Array.isArray(payload.history)).toBe(true);
    expect(payload.history).toEqual(
      expect.arrayContaining([expect.objectContaining({ role: 'player', content: '测试指令' })]),
    );

    expect(await screen.findByText('AI 回复')).toBeInTheDocument();
  });

  it('会展示模块化输出内容', () => {
    renderWithSession(
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
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText('掷骰结果')).toBeInTheDocument();
    expect(screen.getByText('侦查 1D100 → 22 / 60，成功。')).toBeInTheDocument();
  });

  it('会在流式响应中展示状态提示', async () => {
    const user = userEvent.setup();
    const encoder = new TextEncoder();
    const statusChunk = encoder.encode(`data: ${JSON.stringify({ type: 'status', text: '理解玩家指令' })}\n\n`);
    const doneMessage = {
      id: 'msg-1',
      role: 'dm',
      speaker: '肉团长',
      time: '10:01',
      content: 'AI 回复',
    };
    const doneChunk = encoder.encode(`data: ${JSON.stringify({ type: 'done', message: doneMessage })}\n\n`);
    let resolveDone: (() => void) | undefined;
    const donePromise = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    let step = 0;
    const reader = {
      async read() {
        if (step === 0) {
          step += 1;
          return { value: statusChunk, done: false };
        }
        if (step === 1) {
          step += 1;
          await donePromise;
          return { value: doneChunk, done: false };
        }
        return { value: undefined, done: true };
      },
    };
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: { getReader: () => reader },
      } as Response;
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    useGameStore.setState({ activeGameId: 'game-1' });
    renderWithSession(<GameStage script={sampleScript} />);

    const input = screen.getByPlaceholderText('描述你要说的话或采取的行动，肉团长会结合规则做出回应。');
    await user.type(input, '测试指令');
    await user.click(screen.getByRole('button', { name: '发送指令' }));

    expect(await screen.findByText('理解玩家指令')).toBeInTheDocument();
    resolveDone?.();
    expect(await screen.findByText('AI 回复')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('理解玩家指令')).not.toBeInTheDocument();
    });
  });
});
