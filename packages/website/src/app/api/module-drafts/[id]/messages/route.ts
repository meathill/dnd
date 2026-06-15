import { getCloudflareContext } from '@opennextjs/cloudflare';
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

  // 在 Cloudflare Workers 上用 TransformStream + ctx.waitUntil 保证 worker 不被提前终止
  const { ctx } = await getCloudflareContext({ async: true });
  const transform = new TransformStream<Uint8Array, Uint8Array>();
  const writer = transform.writable.getWriter();

  const work = (async () => {
    try {
      await writer.write(encodeSseEvent('user', { userMessage }));

      if (!draft.agentSessionId || !(await isAgentServerConfigured())) {
        await runStubReply(writer, draft, content);
        return;
      }

      let upstream: Response;
      try {
        upstream = await openAgentMessageStream(draft.agentSessionId, content);
      } catch (error) {
        if (error instanceof AgentServerUnavailableError) {
          await runStubReply(writer, draft, content);
          return;
        }
        const message = error instanceof Error ? error.message : '调用 agent-server 失败';
        await writer.write(encodeSseEvent('error', { message }));
        return;
      }

      await pipeUpstream(writer, upstream, id, userMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : '处理消息失败';
      try {
        await writer.write(encodeSseEvent('error', { message }));
      } catch {
        /* writer 可能已 close */
      }
    } finally {
      try {
        await writer.close();
      } catch {
        /* ignore */
      }
    }
  })();

  ctx.waitUntil(work);

  return new Response(transform.readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

const ENCODER = new TextEncoder();

function encodeSseEvent(eventType: string, data: unknown): Uint8Array {
  return ENCODER.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
}

async function runStubReply(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  draft: ModuleDraftRecord,
  content: string,
): Promise<void> {
  const assistantText = [
    `这里是模组创作 stub runtime（agent-server 未配置或会话未绑定）。当前模组《${draft.title}》（slug: ${draft.slug}）。`,
    `editor 输入：${content}`,
    '在 wrangler.jsonc 配置 OPENCODE_AGENT_BASE_URL 与 OPENCODE_AGENT_TOKEN 后，会调用 VPS 上的 opencode agent loop。',
  ].join('\n\n');
  await writer.write(encodeSseEvent('text-delta', { type: 'text-delta', delta: assistantText }));
  const assistantMessage = await createModuleDraftMessage({
    moduleDraftId: draft.id,
    role: 'assistant',
    content: assistantText,
    meta: { runtime: 'stub' },
  });
  await writer.write(encodeSseEvent('done', { assistantMessage }));
}

type UpstreamDonePayload = {
  assistantMessage?: { content?: string; skillCalls?: Array<{ name: string; arguments: Record<string, unknown> }> };
};

async function pipeUpstream(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  upstream: Response,
  draftId: string,
  userMessage: ModuleDraftMessageRecord,
): Promise<void> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
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
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const parsed = parseSseBlock(block);
        if (!parsed) continue;
        if (parsed.event === 'done') {
          try {
            upstreamDone = JSON.parse(parsed.data) as UpstreamDonePayload;
          } catch {
            /* 忽略坏 JSON */
          }
          continue;
        }
        if (parsed.event === 'error') {
          try {
            const errPayload = JSON.parse(parsed.data) as { message?: string };
            receivedError = errPayload.message ?? '上游异常';
          } catch {
            /* ignore */
          }
        }
        try {
          await writer.write(encodeSseEvent(parsed.event, JSON.parse(parsed.data)));
        } catch {
          /* 客户端断开则结束 */
          return;
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }

  if (upstreamDone?.assistantMessage) {
    const assistantMessage = await createModuleDraftMessage({
      moduleDraftId: draftId,
      role: 'assistant',
      content: upstreamDone.assistantMessage.content ?? '',
      meta: {
        runtime: 'agent-server',
        skillCalls: upstreamDone.assistantMessage.skillCalls ?? [],
      },
    });
    await writer.write(encodeSseEvent('done', { assistantMessage }));
  } else if (!receivedError) {
    await writer.write(encodeSseEvent('error', { message: 'agent-server 未返回 done 事件' }));
  }
  // 兼容上游已经发了 error 的情况：不再追加额外 done
  // userMessage 不在 done payload 里重发，前端已经从 user 事件拿到
  void userMessage;
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
