import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPlaySession, mockSendPlayMessage } = vi.hoisted(() => ({
  mockGetPlaySession: vi.fn(),
  mockSendPlayMessage: vi.fn(),
}));

vi.mock('@/lib/play/session', () => ({
  getPlaySession: mockGetPlaySession,
}));

vi.mock('@/lib/play/runtime', () => ({
  sendPlayMessage: mockSendPlayMessage,
}));

import { POST } from './route';

function createRequest(body: unknown) {
  return new Request('http://localhost/api/games/game-1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('play api/games/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlaySession.mockResolvedValue({
      userId: 'user-1',
      displayName: 'Smoke',
      email: 'smoke@example.com',
      balance: 100,
    });
    mockSendPlayMessage.mockResolvedValue({
      userMessage: { id: 'user-message-1', content: 'hello' },
      assistantMessage: { id: 'assistant-message-1', content: 'reply' },
      balance: 95,
    });
  });

  it('returns stub or delegated reply for authenticated session', async () => {
    const response = await POST(createRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as {
      balance: number;
      userMessage: { id: string };
      assistantMessage: { id: string };
    };

    expect(response.status).toBe(200);
    expect(payload.balance).toBe(95);
    expect(payload.userMessage.id).toBe('user-message-1');
    expect(payload.assistantMessage.id).toBe('assistant-message-1');
    expect(mockSendPlayMessage).toHaveBeenCalledWith('game-1', 'hello', expect.objectContaining({ userId: 'user-1' }));
  });

  it('returns 400 for empty message', async () => {
    const response = await POST(createRequest({ content: '   ' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('消息不能为空');
    expect(mockSendPlayMessage).not.toHaveBeenCalled();
  });

  it('returns 401 when session is missing', async () => {
    mockGetPlaySession.mockResolvedValue(null);

    const response = await POST(createRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe('未登录');
  });

  it('maps runtime insufficient balance to 402', async () => {
    mockSendPlayMessage.mockRejectedValue(new Error('余额不足'));

    const response = await POST(createRequest({ content: 'hello' }), {
      params: Promise.resolve({ id: 'game-1' }),
    });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(402);
    expect(payload.error).toBe('余额不足');
  });
});
