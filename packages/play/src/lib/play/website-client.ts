import { getCloudflareContext } from '@opennextjs/cloudflare';
import { buildWebsiteApiUrl, getPlayRuntimeConfig } from '../config/runtime';
import type { GameContext, PlayReply, SessionInfo } from './types';

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
  if (typeof payload.error === 'object') {
    if (typeof payload.error.message === 'string' && payload.error.message.trim()) {
      return payload.error.message;
    }
    try {
      return JSON.stringify(payload.error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

async function getWebsiteBinding(): Promise<Fetcher | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.WEBSITE ?? null;
  } catch {
    return null;
  }
}

async function callWebsite(path: string, init?: RequestInit): Promise<Response> {
  const url = buildWebsiteApiUrl(path);
  const binding = await getWebsiteBinding();
  if (binding) {
    return binding.fetch(url, init);
  }
  const headers = new Headers(init?.headers);
  const { internalServiceToken } = getPlayRuntimeConfig();
  if (internalServiceToken && !headers.has('authorization')) {
    headers.set('Authorization', `Bearer ${internalServiceToken}`);
  }
  return fetch(url, { ...init, headers });
}

function withCookieHeader(headers: HeadersInit | undefined, cookieHeader: string | null | undefined): HeadersInit {
  if (!cookieHeader) {
    return headers ?? {};
  }
  const result = new Headers(headers);
  result.set('cookie', cookieHeader);
  return result;
}

export async function fetchWebsiteSession(cookieHeader?: string | null): Promise<SessionInfo | null> {
  const response = await callWebsite('/api/session', {
    headers: withCookieHeader(undefined, cookieHeader),
  });
  if (!response.ok) {
    throw new Error('读取会话失败');
  }
  const payload = (await response.json()) as { session: SessionInfo | null };
  return payload.session;
}

export async function fetchWebsiteGameContext(gameId: string, cookieHeader?: string | null): Promise<GameContext> {
  const response = await callWebsite(`/api/games/${gameId}`, {
    headers: withCookieHeader(undefined, cookieHeader),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(extractErrorMessage(payload, '读取游戏上下文失败'));
  }
  return (await response.json()) as GameContext;
}

export async function sendWebsiteGameMessage(
  gameId: string,
  content: string,
  cookieHeader?: string | null,
): Promise<PlayReply> {
  const response = await callWebsite(`/api/games/${gameId}/messages`, {
    method: 'POST',
    headers: withCookieHeader({ 'Content-Type': 'application/json' }, cookieHeader),
    body: JSON.stringify({ content }),
  });
  const payload = (await response.json()) as PlayReply & { error?: string };
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, '发送消息失败'));
  }
  return payload;
}

export async function fetchWebsiteGameContextAsInternal(input: {
  gameId: string;
  userId: string;
  balance: number;
}): Promise<GameContext> {
  const response = await callWebsite(`/api/games/${input.gameId}`, {
    headers: {
      'x-muir-user-id': input.userId,
      'x-muir-balance': String(input.balance),
    },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(extractErrorMessage(payload, '读取游戏上下文失败'));
  }
  return (await response.json()) as GameContext;
}

export async function sendWebsiteGameMessageAsInternal(input: {
  gameId: string;
  userId: string;
  balance: number;
  content: string;
}): Promise<PlayReply> {
  const response = await callWebsite(`/api/games/${input.gameId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-muir-user-id': input.userId,
      'x-muir-balance': String(input.balance),
    },
    body: JSON.stringify({ content: input.content }),
  });
  const payload = (await response.json()) as PlayReply & { error?: string };
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, '发送消息失败'));
  }
  return payload;
}

export async function recordWebsiteTurnAsInternal(input: {
  gameId: string;
  userId: string;
  balance: number;
  cookieHeader?: string | null;
  userContent: string;
  assistantContent: string;
  assistantMeta?: Record<string, unknown>;
  chargeAmount?: number;
  chargeReason?: string;
}): Promise<PlayReply> {
  const response = await callWebsite(`/api/internal/games/${input.gameId}/turn`, {
    method: 'POST',
    headers: withCookieHeader(
      {
        'Content-Type': 'application/json',
        'x-muir-user-id': input.userId,
        'x-muir-balance': String(input.balance),
      },
      input.cookieHeader,
    ),
    body: JSON.stringify({
      userContent: input.userContent,
      assistantContent: input.assistantContent,
      assistantMeta: input.assistantMeta,
      chargeAmount: input.chargeAmount,
      chargeReason: input.chargeReason,
    }),
  });
  const payload = (await response.json()) as PlayReply & { error?: string };
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, '记录回合失败'));
  }
  return payload;
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

export async function sendWebsiteChatCompletion(input: {
  userId: string;
  gameId: string;
  model: string;
  messages: ChatCompletionMessage[];
}): Promise<ChatCompletionResult> {
  const response = await callWebsite('/api/llmproxy/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-muir-user-id': input.userId,
      'x-muir-game-id': input.gameId,
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      stream: false,
    }),
  });

  const payload = (await response.json()) as ChatCompletionPayload & { error?: string };
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, '模型请求失败'));
  }

  const choice = payload.choices?.[0];
  const content = extractChatCompletionText(choice?.message?.content);
  if (!content) {
    throw new Error('模型未返回文本消息');
  }

  return {
    responseId: payload.id ?? null,
    content,
    modelId: payload.model?.trim() || input.model,
    finishReason: choice?.finish_reason ?? null,
    usage: payload.usage
      ? {
          promptTokens: payload.usage.prompt_tokens,
          completionTokens: payload.usage.completion_tokens,
          totalTokens: payload.usage.total_tokens,
        }
      : null,
  };
}
