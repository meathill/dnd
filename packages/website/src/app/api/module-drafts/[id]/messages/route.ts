import { NextResponse } from 'next/server';
import { AgentServerUnavailableError, isAgentServerConfigured, openAgentMessageStream } from '@/lib/agent/client';
import { createModuleDraftMessage, listModuleDraftMessages } from '@/lib/db/module-drafts-repo';
import type { ModuleDraftMessageRecord, ModuleDraftRecord } from '@/lib/game/types';
import { loadDraftForOwner } from '@/lib/internal/draft-auth';

type RouteContext = { params: Promise<{ id: string }> };

type SendMessageRequest = {
  content?: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }
  const messages = await listModuleDraftMessages(id);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }

  let body: SendMessageRequest;
  try {
    body = (await request.json()) as SendMessageRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }
  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
  }

  const userMessage = await createModuleDraftMessage({
    moduleDraftId: id,
    role: 'user',
    content,
    meta: { runtime: 'authoring' },
  });

  const draft = access.draft;
  if (!draft.agentSessionId || !(await isAgentServerConfigured())) {
    return buildStreamResponse(streamStubReply(draft, content, userMessage));
  }

  let upstream: Response;
  try {
    upstream = await openAgentMessageStream(draft.agentSessionId, content);
  } catch (error) {
    if (error instanceof AgentServerUnavailableError) {
      return buildStreamResponse(streamStubReply(draft, content, userMessage));
    }
    const message = error instanceof Error ? error.message : '调用 agent-server 失败';
    return buildStreamResponse(streamError(userMessage, message));
  }

  return buildStreamResponse(pipeAgentStream(upstream, id, userMessage));
}

function buildStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

const ENCODER = new TextEncoder();

function encodeSseEvent(eventType: string, data: unknown): Uint8Array {
  return ENCODER.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

function streamStubReply(
  draft: ModuleDraftRecord,
  content: string,
  userMessage: ModuleDraftMessageRecord,
): ReadableStream<Uint8Array> {
  const assistantText = [
    `这里是模组创作 stub runtime（agent-server 未配置或会话未绑定）。当前模组《${draft.title}》（slug: ${draft.slug}）。`,
    `editor 输入：${content}`,
    '在 wrangler.jsonc 配置 OPENCODE_AGENT_BASE_URL 与 OPENCODE_AGENT_TOKEN 后，会调用 VPS 上的 opencode agent loop。',
  ].join('\n\n');

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeSseEvent('user', { userMessage }));
      controller.enqueue(encodeSseEvent('text-delta', { type: 'text-delta', delta: assistantText }));
      const assistantMessage = await createModuleDraftMessage({
        moduleDraftId: draft.id,
        role: 'assistant',
        content: assistantText,
        meta: { runtime: 'stub' },
      });
      controller.enqueue(encodeSseEvent('done', { userMessage, assistantMessage }));
      controller.close();
    },
  });
}

function streamError(userMessage: ModuleDraftMessageRecord, message: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encodeSseEvent('user', { userMessage }));
      controller.enqueue(encodeSseEvent('error', { message }));
      controller.close();
    },
  });
}

type UpstreamDonePayload = {
  assistantMessage?: { content?: string; skillCalls?: Array<{ name: string; arguments: Record<string, unknown> }> };
};

/**
 * 把 agent-server 的 SSE 透传给浏览器，同时拦截 `done` 事件用本地 DB 落盘 assistant 消息，
 * 然后用 DB 记录覆盖一次新的 `done`，保证 UI 看到的是带 DB id 的最终记录。
 */
function pipeAgentStream(
  upstream: Response,
  draftId: string,
  userMessage: ModuleDraftMessageRecord,
): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encodeSseEvent('user', { userMessage }));

      let buffer = '';
      let upstreamDone: UpstreamDonePayload | null = null;
      let receivedError: string | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          while (true) {
            const sep = buffer.indexOf('\n\n');
            if (sep < 0) break;
            const eventBlock = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const parsed = parseSseBlock(eventBlock);
            if (!parsed) continue;
            if (parsed.event === 'done') {
              upstreamDone = JSON.parse(parsed.data) as UpstreamDonePayload;
              // 不直接转发，最后用本地 DB 记录重新发
              continue;
            }
            if (parsed.event === 'error') {
              const errPayload = JSON.parse(parsed.data) as { message?: string };
              receivedError = errPayload.message ?? '上游异常';
            }
            controller.enqueue(encodeSseEvent(parsed.event, JSON.parse(parsed.data)));
          }
        }

        if (upstreamDone?.assistantMessage) {
          const content = upstreamDone.assistantMessage.content ?? '';
          const skillCalls = upstreamDone.assistantMessage.skillCalls ?? [];
          const assistantMessage = await createModuleDraftMessage({
            moduleDraftId: draftId,
            role: 'assistant',
            content,
            meta: { runtime: 'agent-server', skillCalls },
          });
          controller.enqueue(encodeSseEvent('done', { userMessage, assistantMessage }));
        } else if (!receivedError) {
          controller.enqueue(encodeSseEvent('error', { message: 'agent-server 未返回 done 事件' }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '转发 agent-server 流失败';
        controller.enqueue(encodeSseEvent('error', { message }));
      } finally {
        controller.close();
      }
    },
  });
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = 'message';
  const dataParts: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataParts.push(line.slice('data:'.length).trim());
    }
  }
  if (dataParts.length === 0) return null;
  return { event, data: dataParts.join('\n') };
}
