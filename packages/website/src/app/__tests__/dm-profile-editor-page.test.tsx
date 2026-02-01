import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { DmProfileDetail } from '../../lib/game/types';
import { SessionProvider } from '../../lib/session/session-context';
import type { SessionInfo } from '../../lib/session/session-types';
import { DmProfileEditorContent } from '../admin/dm-profiles/[id]/dm-profile-editor-page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const originalFetch = global.fetch;

function createResponse(data: unknown, init?: { ok?: boolean; status?: number }): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    json: async () => data,
  } as Response;
}

function renderWithSession(node: ReactNode, session: SessionInfo | null) {
  return render(
    <SessionProvider value={{ session, reloadSession: async () => null, requestAuth: vi.fn() }}>
      {node}
    </SessionProvider>,
  );
}

const sampleProfile: DmProfileDetail = {
  id: 'dm-1',
  name: '温和推进',
  summary: '偏向剧情',
  analysisGuide: '分析指南',
  narrationGuide: '叙事指南',
  isDefault: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  rules: [
    {
      id: 'rule-1',
      dmProfileId: 'dm-1',
      phase: 'analysis',
      category: '越权',
      title: '拒绝越权',
      content: '拆分并要求掷骰。',
      order: 1,
      isEnabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

describe('DM 风格编辑页', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('加载并展示风格信息', async () => {
    const fetchMock = vi.fn(async () => createResponse({ profile: sampleProfile }));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession(<DmProfileEditorContent profileId="dm-1" />, {
      userId: 'root',
      displayName: 'Root',
      settings: null,
      isRoot: true,
    });

    expect(await screen.findByDisplayValue('温和推进')).toBeInTheDocument();
    expect(screen.getByDisplayValue('偏向剧情')).toBeInTheDocument();
  });

  it('保存风格会发送更新请求', async () => {
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/dm-profiles/dm-1' && init?.method === 'PATCH') {
        return createResponse({ profile: { ...sampleProfile, name: '高速推进' } });
      }
      return createResponse({ profile: sampleProfile });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession(<DmProfileEditorContent profileId="dm-1" />, {
      userId: 'root',
      displayName: 'Root',
      settings: null,
      isRoot: true,
    });

    const nameInput = await screen.findByLabelText('风格名称');
    const user = userEvent.setup();
    await user.clear(nameInput);
    await user.type(nameInput, '高速推进');
    await user.click(screen.getByRole('button', { name: '保存修改' }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(
        (call) => call[0] === '/api/admin/dm-profiles/dm-1' && call[1]?.method === 'PATCH',
      );
      expect(patchCall).toBeTruthy();
    });
  });

  it('新增规则会调用创建接口', async () => {
    const fetchMock = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/admin/dm-profiles/dm-1/rules' && init?.method === 'POST') {
        return createResponse({
          rule: {
            id: 'rule-2',
            dmProfileId: 'dm-1',
            phase: 'analysis',
            category: '',
            title: '处理跳关',
            content: '拆分动作。',
            order: 2,
            isEnabled: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        });
      }
      return createResponse({ profile: sampleProfile });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithSession(<DmProfileEditorContent profileId="dm-1" />, {
      userId: 'root',
      displayName: 'Root',
      settings: null,
      isRoot: true,
    });

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('新规则标题'), '处理跳关');
    await user.type(screen.getByLabelText('新规则内容'), '拆分动作。');
    await user.click(screen.getByRole('button', { name: '添加规则' }));

    expect(await screen.findByDisplayValue('处理跳关')).toBeInTheDocument();
  });
});
