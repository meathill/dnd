/**
 * 调 VPS 上 @dnd/agent-server 的 HTTP client。
 *
 * 接口契约必须与 packages/agent-server/src/types.ts 保持一致。
 * 这里没有直接 import agent-server 的类型，因为 worker 包不应依赖 Node.js 包。
 */

import { resolveAgentServerConfig } from '../config/runtime';

export type AgentScenario = 'authoring' | 'play';

export type AgentMessage = {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  skillCalls: Array<{ name: string; arguments: Record<string, unknown>; result?: Record<string, unknown> | string }>;
  createdAt: string;
};

export type AgentSession = {
  id: string;
  scenario: AgentScenario;
  ownerId: string;
  externalRef: string;
  workspacePath: string;
  opencodeSessionId: string | null;
  status: 'active' | 'closed';
  createdAt: string;
  updatedAt: string;
};

export type CreateAgentSessionInput = {
  scenario: AgentScenario;
  ownerId: string;
  externalRef: string;
  moduleSlug?: string;
  meta?: Record<string, unknown>;
  initialModuleData?: Record<string, unknown>;
};

export type SendAgentMessageResult = {
  userMessage: AgentMessage;
  assistantMessage: AgentMessage;
};

export type AgentSessionDataSnapshot = {
  sessionId: string;
  workspacePath: string;
  moduleData: Record<string, unknown> | null;
};

export type PublishAgentSessionResult = {
  publishedModuleId: string;
  publishedWorkspacePath: string;
  moduleData: Record<string, unknown>;
};

export class AgentServerUnavailableError extends Error {
  constructor() {
    super('agent-server 未配置');
  }
}

async function getEndpoint(): Promise<{ baseUrl: string; token: string } | null> {
  const config = await resolveAgentServerConfig();
  if (!config.baseUrl || !config.token) {
    return null;
  }
  return { baseUrl: config.baseUrl, token: config.token };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const endpoint = await getEndpoint();
  if (!endpoint) {
    throw new AgentServerUnavailableError();
  }
  const response = await fetch(new URL(path, endpoint.baseUrl), {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${endpoint.token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`agent-server 请求失败 ${response.status}: ${text}`);
  }
  return (await response.json()) as T;
}

export async function isAgentServerConfigured(): Promise<boolean> {
  return (await getEndpoint()) !== null;
}

export async function createAgentSession(input: CreateAgentSessionInput): Promise<AgentSession> {
  const payload = await request<{ session: AgentSession }>('POST', '/sessions', input);
  return payload.session;
}

export async function sendAgentMessage(sessionId: string, content: string): Promise<SendAgentMessageResult> {
  return request<SendAgentMessageResult>('POST', `/sessions/${sessionId}/messages`, { content });
}

export async function fetchAgentSessionData(sessionId: string, moduleSlug: string): Promise<AgentSessionDataSnapshot> {
  const params = new URLSearchParams({ moduleSlug });
  return request<AgentSessionDataSnapshot>('GET', `/sessions/${sessionId}/data?${params.toString()}`);
}

export async function publishAgentSession(
  sessionId: string,
  publishedModuleId: string,
): Promise<PublishAgentSessionResult> {
  return request<PublishAgentSessionResult>('POST', `/sessions/${sessionId}/publish`, { publishedModuleId });
}
