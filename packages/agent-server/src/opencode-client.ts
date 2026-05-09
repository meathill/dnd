import { createOpencodeClient, type OpencodeClient } from '@opencode-ai/sdk';
import type { AgentMessage, AgentSkillCall } from './types.ts';

export type OpencodeClientOptions = {
  baseUrl: string;
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

type OpencodeReplyPart = {
  type: string;
  text?: string;
  tool?: string;
  state?: { input?: unknown; metadata?: unknown } | null;
};

function extractTextFromParts(parts: ReadonlyArray<OpencodeReplyPart>): string {
  return parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

function extractSkillCallsFromParts(parts: ReadonlyArray<OpencodeReplyPart>): AgentSkillCall[] {
  const calls: AgentSkillCall[] = [];
  for (const part of parts) {
    if (part.type !== 'tool' || typeof part.tool !== 'string') {
      continue;
    }
    const args =
      (part.state?.input as Record<string, unknown> | undefined) ??
      (part.state?.metadata as Record<string, unknown> | undefined) ??
      {};
    calls.push({ name: part.tool, arguments: args });
  }
  return calls;
}

/**
 * 真实 opencode adapter：通过 @opencode-ai/sdk 调用 opencode serve（同机 127.0.0.1:4096）。
 *
 * opencode serve 在 127.0.0.1 上跑 unsecured 模式（不需要 password）；
 * 跨网络鉴权由 agent-server 自身的 bearer token 在外层做。
 */
export class HttpOpencodeAdapter implements OpencodeAdapter {
  private readonly client: OpencodeClient;

  constructor(options: OpencodeClientOptions) {
    this.client = createOpencodeClient({ baseUrl: options.baseUrl });
  }

  async chat(input: OpencodeChatInput): Promise<OpencodeChatResult> {
    let sessionId = input.opencodeSessionId;

    if (!sessionId) {
      const created = await this.client.session.create({
        body: { title: `${input.scenario}-${new Date().toISOString()}` },
        query: { directory: input.workspacePath },
      });
      const newId = (created.data as { id?: string } | undefined)?.id;
      if (!newId) {
        throw new Error('opencode session.create 没有返回 id');
      }
      sessionId = newId;
    }

    const userText = [input.contextSummary, input.content].filter(Boolean).join('\n\n');
    const reply = await this.client.session.prompt({
      path: { id: sessionId },
      query: { directory: input.workspacePath },
      body: {
        parts: [{ type: 'text', text: userText }],
      },
    });

    const data = reply.data as { parts?: OpencodeReplyPart[] } | undefined;
    const parts = data?.parts ?? [];
    const text = extractTextFromParts(parts);
    const skillCalls = extractSkillCallsFromParts(parts);

    return {
      opencodeSessionId: sessionId,
      assistantContent: text || '(opencode 未返回文本内容)',
      skillCalls,
    };
  }
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
