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

// 流式回调里能拿到的事件类型——比 opencode 全量事件简化过的子集
export type OpencodeChatEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call'; name: string; arguments: Record<string, unknown> }
  | { type: 'tool-completed'; name: string };

export type OpencodeChatEventHandler = (event: OpencodeChatEvent) => void;

export interface OpencodeAdapter {
  chat(input: OpencodeChatInput): Promise<OpencodeChatResult>;
  chatStream(input: OpencodeChatInput, onEvent: OpencodeChatEventHandler): Promise<OpencodeChatResult>;
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

  async chatStream(input: OpencodeChatInput, onEvent: OpencodeChatEventHandler): Promise<OpencodeChatResult> {
    const result = await this.chat(input);
    // stub 模式下伪造一次完整 delta，让前端能看到流式效果
    onEvent({ type: 'text-delta', delta: result.assistantContent });
    return result;
  }
}

const NO_QUESTION_SYSTEM_PROMPT = [
  '你是模组创作 / 游戏运行的 agent，运行在无人交互的 server 模式下。',
  '不要使用 question 工具向用户提问；用户不会看到，也无法回答。',
  '如果信息不足，请基于已知材料给出最佳判断并直接推进，把"需要用户确认的点"作为正文输出的一部分写出来即可。',
  '每一轮请尽量在一次回复内给出可落地的产出。',
].join('\n');

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

  private async ensureSession(input: OpencodeChatInput): Promise<string> {
    if (input.opencodeSessionId) {
      return input.opencodeSessionId;
    }
    const created = await this.client.session.create({
      body: { title: `${input.scenario}-${new Date().toISOString()}` },
      query: { directory: input.workspacePath },
    });
    const newId = (created.data as { id?: string } | undefined)?.id;
    if (!newId) {
      throw new Error('opencode session.create 没有返回 id');
    }
    return newId;
  }

  private buildPromptBody(input: OpencodeChatInput) {
    const userText = [input.contextSummary, input.content].filter(Boolean).join('\n\n');
    return {
      parts: [{ type: 'text' as const, text: userText }],
      system: NO_QUESTION_SYSTEM_PROMPT,
      // question 是交互式工具，server 模式下没人答会让 agent loop 卡住直至 Cloudflare 100s 超时
      tools: { question: false },
    };
  }

  async chat(input: OpencodeChatInput): Promise<OpencodeChatResult> {
    const sessionId = await this.ensureSession(input);
    const reply = await this.client.session.prompt({
      path: { id: sessionId },
      query: { directory: input.workspacePath },
      body: this.buildPromptBody(input),
    });

    const data = reply.data as { parts?: OpencodeReplyPart[] } | undefined;
    const parts = data?.parts ?? [];
    return {
      opencodeSessionId: sessionId,
      assistantContent: extractTextFromParts(parts) || '(opencode 未返回文本内容)',
      skillCalls: extractSkillCallsFromParts(parts),
    };
  }

  async chatStream(input: OpencodeChatInput, onEvent: OpencodeChatEventHandler): Promise<OpencodeChatResult> {
    const sessionId = await this.ensureSession(input);
    const eventResult = await this.client.event.subscribe();
    const eventStream = eventResult.stream;

    const seenToolCalls = new Set<string>();
    const seenToolCompletions = new Set<string>();
    const consume = (async () => {
      try {
        for await (const event of eventStream) {
          if (!event || event.type !== 'message.part.updated') continue;
          const props = event.properties as {
            part?: {
              type?: string;
              sessionID?: string;
              tool?: string;
              callID?: string;
              state?: { status?: string; input?: Record<string, unknown> };
            };
            delta?: string;
          };
          if (props.part?.sessionID !== sessionId) continue;

          if (props.part.type === 'text' && typeof props.delta === 'string' && props.delta.length > 0) {
            onEvent({ type: 'text-delta', delta: props.delta });
          } else if (props.part.type === 'tool' && typeof props.part.tool === 'string') {
            const callId = props.part.callID ?? props.part.tool;
            const status = props.part.state?.status;
            if (status === 'running' && !seenToolCalls.has(callId)) {
              seenToolCalls.add(callId);
              onEvent({
                type: 'tool-call',
                name: props.part.tool,
                arguments: props.part.state?.input ?? {},
              });
            } else if (status === 'completed' && !seenToolCompletions.has(callId)) {
              seenToolCompletions.add(callId);
              onEvent({ type: 'tool-completed', name: props.part.tool });
            }
          }
        }
      } catch {
        // 事件流被关闭时会抛出，忽略
      }
    })();

    let promptResult: Awaited<ReturnType<OpencodeClient['session']['prompt']>>;
    try {
      promptResult = await this.client.session.prompt({
        path: { id: sessionId },
        query: { directory: input.workspacePath },
        body: this.buildPromptBody(input),
      });
    } finally {
      // session.prompt 已结束，关闭 event 订阅
      try {
        await eventStream.return?.(undefined as never);
      } catch {
        /* ignore */
      }
      await consume;
    }

    const data = promptResult.data as { parts?: OpencodeReplyPart[] } | undefined;
    const parts = data?.parts ?? [];
    return {
      opencodeSessionId: sessionId,
      assistantContent: extractTextFromParts(parts) || '(opencode 未返回文本内容)',
      skillCalls: extractSkillCallsFromParts(parts),
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
