import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

const mockFetch = vi.fn();

describe('api/llmproxy proxy route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    process.env.INTERNAL_SERVICE_TOKEN = 'internal-token';
    process.env.LLM_PROXY_UPSTREAM_BASE_URL = 'https://upstream.example.com';
    Reflect.deleteProperty(process.env, 'LLM_PROXY_ALLOWED_MODELS');
    Reflect.deleteProperty(process.env, 'LLM_PROXY_UPSTREAM_API_KEY');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(process.env, 'INTERNAL_SERVICE_TOKEN');
    Reflect.deleteProperty(process.env, 'INTERNAL_SERVICE_TOKENS');
    Reflect.deleteProperty(process.env, 'LLM_PROXY_UPSTREAM_BASE_URL');
    Reflect.deleteProperty(process.env, 'LLM_PROXY_ALLOWED_MODELS');
    Reflect.deleteProperty(process.env, 'LLM_PROXY_UPSTREAM_API_KEY');
  });

  it('rejects requests without internal bearer token', async () => {
    const request = new Request('http://localhost/api/llmproxy/v1/models');
    const response = await GET(request, { params: Promise.resolve({ path: ['v1', 'models'] }) });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe('缺少内部服务凭证');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects requests when upstream is not configured', async () => {
    Reflect.deleteProperty(process.env, 'LLM_PROXY_UPSTREAM_BASE_URL');

    const request = new Request('http://localhost/api/llmproxy/v1/models', {
      headers: { Authorization: 'Bearer internal-token' },
    });
    const response = await GET(request, { params: Promise.resolve({ path: ['v1', 'models'] }) });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(payload.error).toBe('LLM 上游未配置');
  });

  it('requires game context headers for proxied POST requests', async () => {
    const request = new Request('http://localhost/api/llmproxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer internal-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'gpt-4.1-mini' }),
    });
    const response = await POST(request, { params: Promise.resolve({ path: ['v1', 'chat', 'completions'] }) });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe('缺少游戏上下文');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('rejects models outside the configured allowlist', async () => {
    process.env.LLM_PROXY_ALLOWED_MODELS = 'gpt-4.1-mini gpt-4o-mini';

    const request = new Request('http://localhost/api/llmproxy/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer internal-token',
        'Content-Type': 'application/json',
        'x-muir-user-id': 'user-1',
        'x-muir-game-id': 'game-1',
      },
      body: JSON.stringify({ model: 'gpt-5' }),
    });
    const response = await POST(request, { params: Promise.resolve({ path: ['v1', 'chat', 'completions'] }) });
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(403);
    expect(payload.error).toBe('模型未开放');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('proxies request to upstream with rewritten authorization header', async () => {
    process.env.LLM_PROXY_ALLOWED_MODELS = 'gpt-4.1-mini';
    process.env.LLM_PROXY_UPSTREAM_API_KEY = 'upstream-secret';
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 'resp_1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'x-request-id': 'req_1' },
      }),
    );

    const request = new Request('http://localhost/api/llmproxy/v1/chat/completions?stream=false', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer internal-token',
        'Content-Type': 'application/json',
        'x-muir-user-id': 'user-1',
        'x-muir-game-id': 'game-1',
      },
      body: JSON.stringify({ model: 'gpt-4.1-mini', messages: [] }),
    });

    const response = await POST(request, { params: Promise.resolve({ path: ['v1', 'chat', 'completions'] }) });
    const payload = (await response.json()) as { id: string };

    expect(response.status).toBe(200);
    expect(payload.id).toBe('resp_1');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://upstream.example.com/v1/chat/completions?stream=false',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ model: 'gpt-4.1-mini', messages: [] }),
        headers: expect.any(Headers),
      }),
    );

    const forwardedHeaders = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(forwardedHeaders.get('Authorization')).toBe('Bearer upstream-secret');
    expect(forwardedHeaders.get('x-muir-user-id')).toBeNull();
    expect(forwardedHeaders.get('x-muir-game-id')).toBeNull();
  });
});
