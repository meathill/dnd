import { buildWebsiteApiUrl, getPlayRuntimeConfig } from '../config/runtime';
import type { GameContext, PlayReply, SessionInfo } from './types';

function buildHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  const { internalServiceToken } = getPlayRuntimeConfig();
  if (internalServiceToken) {
    result.set('Authorization', `Bearer ${internalServiceToken}`);
  }
  return result;
}

export async function fetchWebsiteSession(cookieHeader?: string | null): Promise<SessionInfo | null> {
  const response = await fetch(buildWebsiteApiUrl('/api/session'), {
    headers: buildHeaders(cookieHeader ? { cookie: cookieHeader } : undefined),
  });
  if (!response.ok) {
    throw new Error('读取会话失败');
  }
  const payload = (await response.json()) as { session: SessionInfo | null };
  return payload.session;
}

export async function fetchWebsiteGameContext(gameId: string, cookieHeader?: string | null): Promise<GameContext> {
  const response = await fetch(buildWebsiteApiUrl(`/api/games/${gameId}`), {
    headers: buildHeaders(cookieHeader ? { cookie: cookieHeader } : undefined),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || '读取游戏上下文失败');
  }
  return (await response.json()) as GameContext;
}

export async function sendWebsiteGameMessage(gameId: string, content: string, cookieHeader?: string | null): Promise<PlayReply> {
  const response = await fetch(buildWebsiteApiUrl(`/api/games/${gameId}/messages`), {
    method: 'POST',
    headers: buildHeaders({
      'Content-Type': 'application/json',
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    }),
    body: JSON.stringify({ content }),
  });
  const payload = (await response.json()) as PlayReply & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || '发送消息失败');
  }
  return payload;
}

export async function fetchWebsiteGameContextAsInternal(input: {
  gameId: string;
  userId: string;
  balance: number;
}): Promise<GameContext> {
  const response = await fetch(buildWebsiteApiUrl(`/api/games/${input.gameId}`), {
    headers: buildHeaders({
      'x-muir-user-id': input.userId,
      'x-muir-balance': String(input.balance),
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || '读取游戏上下文失败');
  }
  return (await response.json()) as GameContext;
}

export async function sendWebsiteGameMessageAsInternal(input: {
  gameId: string;
  userId: string;
  balance: number;
  content: string;
}): Promise<PlayReply> {
  const response = await fetch(buildWebsiteApiUrl(`/api/games/${input.gameId}/messages`), {
    method: 'POST',
    headers: buildHeaders({
      'Content-Type': 'application/json',
      'x-muir-user-id': input.userId,
      'x-muir-balance': String(input.balance),
    }),
    body: JSON.stringify({ content: input.content }),
  });
  const payload = (await response.json()) as PlayReply & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || '发送消息失败');
  }
  return payload;
}
