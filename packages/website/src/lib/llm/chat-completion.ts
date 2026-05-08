import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getRuntimeConfig } from '../config/runtime';

export type ChatCompletionMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionResult = {
  responseId: string | null;
  content: string;
  modelId: string;
  finishReason: string | null;
  usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  } | null;
};

type ChatCompletionPayload = {
  id?: string;
  model?: string;
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: unknown;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type ErrorEnvelope = {
  error?: string | { message?: string; type?: string; code?: string | number };
};

function extractErrorMessage(payload: ErrorEnvelope | null, fallback: string): string {
  if (!payload?.error) {
    return fallback;
  }
  if (typeof payload.error === 'string') {
    return payload.error;
  }
  if (typeof payload.error.message === 'string' && payload.error.message.trim()) {
    return payload.error.message;
  }
  try {
    return JSON.stringify(payload.error);
  } catch {
    return fallback;
  }
}

async function resolveUpstreamApiKey(): Promise<string | undefined> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const fromBinding = (env as unknown as Record<string, unknown>).LLM_PROXY_UPSTREAM_API_KEY;
    if (typeof fromBinding === 'string' && fromBinding.trim()) {
      return fromBinding.trim();
    }
  } catch {
    // 非 Cloudflare 运行时（vitest、本地 node 直跑），落到 process.env
  }
  return process.env.LLM_PROXY_UPSTREAM_API_KEY?.trim();
}

function extractChatCompletionText(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .map((part) => {
      if (typeof part !== 'object' || !part || !('text' in part)) {
        return '';
      }
      return typeof part.text === 'string' ? part.text : '';
    })
    .join('\n')
    .trim();
}

export async function createChatCompletion(input: {
  model: string;
  messages: ChatCompletionMessage[];
}): Promise<ChatCompletionResult> {
  const { llmUpstreamBaseUrl, llmAllowedModels } = getRuntimeConfig();
  const model = input.model.trim();
  if (!model) {
    throw new Error('缺少模型标识');
  }
  if (!llmUpstreamBaseUrl) {
    throw new Error('LLM 上游未配置');
  }
  if (llmAllowedModels.length > 0 && !llmAllowedModels.includes(model)) {
    throw new Error('模型未开放');
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
  });
  const upstreamApiKey = await resolveUpstreamApiKey();
  if (upstreamApiKey) {
    headers.set('Authorization', `Bearer ${upstreamApiKey}`);
  }

  const response = await fetch(new URL('v1/chat/completions', llmUpstreamBaseUrl).toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: input.messages,
      stream: false,
    }),
  });
  const payload = (await response.json().catch(() => null)) as (ChatCompletionPayload & ErrorEnvelope) | null;
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, '模型请求失败'));
  }

  const choice = payload?.choices?.[0];
  const content = extractChatCompletionText(choice?.message?.content);
  if (!content) {
    throw new Error('模型未返回文本消息');
  }

  return {
    responseId: payload?.id ?? null,
    content,
    modelId: payload?.model?.trim() || model,
    finishReason: choice?.finish_reason ?? null,
    usage: payload?.usage
      ? {
          promptTokens: payload.usage.prompt_tokens,
          completionTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens,
        }
      : null,
  };
}
