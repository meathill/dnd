import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import OpenAI from 'openai';
import {
  run,
  setDefaultOpenAIClient,
  setTracingDisabled,
  RunItemStreamEvent,
  RunRawModelStreamEvent,
  RunToolCallItem,
  RunToolCallOutputItem,
} from '@openai/agents';
import { requireAdmin } from '@/app/api/admin/admin-utils';
import { findAiModelByLookup, getScriptById, getUserSettings } from '@/lib/db/repositories';
import { createScriptEditorAgent, type ScriptEditorAgentContext } from '@/lib/ai/script-editor-agent';
import { normalizeModel } from '@/lib/ai/ai-models';

type ChatHistoryEntry = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  scriptId: string;
  input: string;
  history?: ChatHistoryEntry[];
};

function parseBody(body: unknown): ChatRequestBody | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  const scriptId = typeof record.scriptId === 'string' ? record.scriptId.trim() : '';
  const input = typeof record.input === 'string' ? record.input.trim() : '';
  if (!scriptId || !input) {
    return null;
  }
  const history: ChatHistoryEntry[] = [];
  if (Array.isArray(record.history)) {
    for (const item of record.history) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as Record<string, unknown>;
      const role = entry.role;
      const content = typeof entry.content === 'string' ? entry.content.trim() : '';
      if (!content) continue;
      if (role === 'user' || role === 'assistant') {
        history.push({ role, content });
      }
    }
  }
  return { scriptId, input, history };
}

function sse(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

export async function POST(request: Request) {
  const adminContext = await requireAdmin(request);
  if (adminContext instanceof NextResponse) {
    return adminContext;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }
  const parsed = parseBody(body);
  if (!parsed) {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 });
  }

  try {
    const [script, settings] = await Promise.all([
      getScriptById(adminContext.db, parsed.scriptId),
      getUserSettings(adminContext.db, adminContext.userId),
    ]);
    if (!script) {
      return NextResponse.json({ error: '剧本不存在' }, { status: 404 });
    }

    const provider = settings?.provider ?? 'openai';
    const generalModel = settings?.generalModel?.trim() || normalizeModel(provider, 'general', '');

    const { env } = await getCloudflareContext({ async: true });
    const customModel = await findAiModelByLookup(adminContext.db, provider, 'general', generalModel);
    const envRecord = env as unknown as Record<string, string | undefined>;
    const apiKey = customModel?.apiKey || envRecord.OPENAI_API_KEY || '';
    const baseURL = customModel?.baseUrl || envRecord.OPENAI_BASE_URL || undefined;
    const openaiClient = new OpenAI({ apiKey, baseURL });
    setDefaultOpenAIClient(openaiClient);
    setTracingDisabled(true);

    const agent = createScriptEditorAgent(generalModel);
    const agentContext: ScriptEditorAgentContext = { script };

    const historyInput = (parsed.history ?? []).slice(-20);
    const agentInput: ChatHistoryEntry[] = [...historyInput];
    const lastEntry = agentInput[agentInput.length - 1];
    if (!lastEntry || lastEntry.role !== 'user' || lastEntry.content !== parsed.input) {
      agentInput.push({ role: 'user', content: parsed.input });
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(sse({ type: 'status', text: '助手正在思考...' }));

          // SDK 类型对 assistant 项要求 status 字段，这里把简单的 {role,content} 历史
          // 直接传入即可——运行时 OpenAI agents SDK 会接受标准 chat 消息形态。
          const result = await run(agent, agentInput as unknown as Parameters<typeof run>[1], {
            context: agentContext,
            stream: true,
            maxTurns: 6,
          });

          let fullText = '';
          for await (const event of result) {
            if (event instanceof RunRawModelStreamEvent) {
              const raw = event.data as Record<string, unknown>;
              const choices = raw?.choices as Array<{ delta?: { content?: string } }> | undefined;
              const delta = choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(sse({ type: 'delta', text: delta }));
              }
            } else if (event instanceof RunItemStreamEvent) {
              const item = event.item;
              if (item instanceof RunToolCallItem) {
                const raw = item.rawItem as { name?: string; arguments?: string; callId?: string; call_id?: string };
                const name = raw.name ?? 'unknown';
                const callId = raw.callId ?? raw.call_id ?? `${name}-${Date.now()}`;
                controller.enqueue(
                  sse({
                    type: 'tool_call',
                    callId,
                    name,
                    arguments: raw.arguments ?? '{}',
                  }),
                );
              } else if (item instanceof RunToolCallOutputItem) {
                const raw = item.rawItem as { callId?: string; call_id?: string; name?: string };
                const callId = raw.callId ?? raw.call_id ?? raw.name ?? 'unknown';
                const output = typeof item.output === 'string' ? item.output : JSON.stringify(item.output);
                controller.enqueue(sse({ type: 'tool_result', callId, result: output }));
              }
            }
          }

          controller.enqueue(sse({ type: 'done', text: fullText }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI 请求失败';
          console.error('[api/admin/scripts/chat] 失败', error);
          controller.enqueue(sse({ type: 'error', error: message }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[api/admin/scripts/chat] 请求失败', error);
    const message = error instanceof Error ? error.message : '请求失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
