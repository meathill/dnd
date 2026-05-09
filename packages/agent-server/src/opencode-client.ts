import type { AgentMessage, AgentSkillCall } from './types.ts';

export type OpencodeClientOptions = {
  baseUrl: string;
  serverPassword: string | null;
};

export type OpencodeChatInput = {
  opencodeSessionId: string | null;
  workspacePath: string;
  // 用户消息
  content: string;
  // 上下文摘要（meta + 当前 module data 概览），由 agent-server 拼好
  contextSummary: string | null;
  scenario: 'authoring' | 'play';
};

export type OpencodeChatResult = {
  opencodeSessionId: string;
  assistantContent: string;
  skillCalls: AgentSkillCall[];
};

export interface OpencodeAdapter {
  chat(input: OpencodeChatInput): Promise<OpencodeChatResult>;
}

/**
 * stub adapter：在没有部署 opencode 时也能让 website 端调通完整链路。
 */
export class StubOpencodeAdapter implements OpencodeAdapter {
  async chat(input: OpencodeChatInput): Promise<OpencodeChatResult> {
    const opencodeSessionId = input.opencodeSessionId ?? `stub-${Date.now()}`;
    const lines = [
      `[stub agent] scenario=${input.scenario}`,
      `[stub agent] workspace=${input.workspacePath}`,
      `[stub agent] 收到消息：${input.content}`,
      '部署 opencode（OPENCODE_MODE=opencode）后，这里会真正调用 agent loop 与 skill 执行。',
    ];
    return {
      opencodeSessionId,
      assistantContent: lines.join('\n'),
      skillCalls: [],
    };
  }
}

/**
 * 真实 opencode adapter：通过 opencode serve 的 HTTP API 维护 session 与发送消息。
 *
 * 注意：opencode 的 schema 还在迭代中，本类按 4096 端口 OpenAPI 的最常见形态写。
 * 部署后如果端点签名变了，把这个类按实际响应改一下即可，不影响 agent-server 的接口契约。
 */
export class HttpOpencodeAdapter implements OpencodeAdapter {
  constructor(private readonly options: OpencodeClientOptions) {}

  private get headers(): HeadersInit {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (this.options.serverPassword) {
      headers['x-opencode-password'] = this.options.serverPassword;
    }
    return headers;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(new URL(path, this.options.baseUrl), {
      method,
      headers: this.headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`opencode 请求失败 ${response.status}: ${text}`);
    }
    return (await response.json()) as T;
  }

  async chat(input: OpencodeChatInput): Promise<OpencodeChatResult> {
    let sessionId = input.opencodeSessionId;
    if (!sessionId) {
      const created = await this.request<{ id: string }>('POST', '/session', {
        directory: input.workspacePath,
      });
      sessionId = created.id;
    }
    const userMessage = [input.contextSummary, input.content].filter(Boolean).join('\n\n');
    const reply = await this.request<{ content?: string; parts?: Array<{ text?: string; type?: string }> }>(
      'POST',
      `/session/${sessionId}/message`,
      { content: userMessage },
    );
    const assistantContent =
      typeof reply.content === 'string'
        ? reply.content
        : (reply.parts ?? [])
            .filter((part) => part.type !== 'tool-call')
            .map((part) => part.text ?? '')
            .join('\n')
            .trim();
    return {
      opencodeSessionId: sessionId,
      assistantContent: assistantContent || '(opencode 未返回文本内容)',
      skillCalls: extractSkillCalls(reply),
    };
  }
}

function extractSkillCalls(reply: {
  parts?: Array<{ type?: string; name?: string; arguments?: unknown }>;
}): AgentSkillCall[] {
  if (!Array.isArray(reply.parts)) {
    return [];
  }
  const calls: AgentSkillCall[] = [];
  for (const part of reply.parts) {
    if (part.type === 'tool-call' && typeof part.name === 'string') {
      calls.push({
        name: part.name,
        arguments: (part.arguments as Record<string, unknown> | undefined) ?? {},
      });
    }
  }
  return calls;
}

export function buildAgentMessage(input: {
  sessionId: string;
  role: AgentMessage['role'];
  content: string;
  skillCalls: AgentSkillCall[];
}): AgentMessage {
  return {
    id: crypto.randomUUID(),
    sessionId: input.sessionId,
    role: input.role,
    content: input.content,
    skillCalls: input.skillCalls,
    createdAt: new Date().toISOString(),
  };
}
