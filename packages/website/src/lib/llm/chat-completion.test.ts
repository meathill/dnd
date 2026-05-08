import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChatCompletion } from './chat-completion';

const mockFetch = vi.fn();

describe('chat completion helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    process.env.NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL = 'https://upstream.example.com';
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS');
    Reflect.deleteProperty(process.env, 'LLM_PROXY_UPSTREAM_API_KEY');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL');
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS');
    Reflect.deleteProperty(process.env, 'LLM_PROXY_UPSTREAM_API_KEY');
  });

  it('rejects when upstream is not configured', async () => {
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL');

    await expect(createChatCompletion({ model: 'gpt-4.1-mini', messages: [] })).rejects.toThrow('LLM 上游未配置');
  });

  it('rejects models outside the configured allowlist', async () => {
    process.env.NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS = 'gpt-4.1-mini gpt-4o-mini';

    await expect(createChatCompletion({ model: 'gpt-5', messages: [] })).rejects.toThrow('模型未开放');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('forwards request to upstream with rewritten authorization header', async () => {
    process.env.NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS = 'gpt-4.1-mini';
    process.env.LLM_PROXY_UPSTREAM_API_KEY = 'upstream-secret';
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'resp_1',
          model: 'gpt-4.1-mini',
          choices: [{ finish_reason: 'stop', message: { content: 'reply' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const result = await createChatCompletion({
      model: 'gpt-4.1-mini',
      messages: [{ role: 'user', content: 'hello' }],
    });

    expect(result).toEqual({
      responseId: 'resp_1',
      content: 'reply',
      modelId: 'gpt-4.1-mini',
      finishReason: 'stop',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://upstream.example.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [{ role: 'user', content: 'hello' }],
          stream: false,
        }),
        headers: expect.any(Headers),
      }),
    );

    const headers = mockFetch.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer upstream-secret');
  });
});
