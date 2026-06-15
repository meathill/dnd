import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { loadConfig } from './config.ts';
import { buildAgentMessage, HttpOpencodeAdapter, StubOpencodeAdapter } from './opencode-client.ts';
import { SessionStore } from './sessions.ts';
import type {
  AgentSession,
  CreateSessionInput,
  PublishSessionInput,
  PublishSessionResult,
  SendMessageInput,
  SendMessageResult,
  SessionDataSnapshot,
} from './types.ts';
import {
  buildPublishedModuleWorkspacePath,
  buildSessionWorkspacePath,
  prepareSessionWorkspace,
  publishSessionWorkspace,
  readSessionModuleData,
} from './workspace.ts';

export function createApp(options: { store?: SessionStore; adapter?: ReturnType<typeof buildAdapter> } = {}) {
  const config = loadConfig();
  const store = options.store ?? new SessionStore();
  const adapter = options.adapter ?? buildAdapter(config);
  const app = new Hono();

  app.use('*', async (c, next) => {
    if (c.req.path === '/healthz') {
      return next();
    }
    const header = c.req.header('authorization');
    const expected = `Bearer ${config.authToken}`;
    if (header !== expected) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return next();
  });

  app.get('/healthz', (c) => c.json({ ok: true, opencodeMode: config.opencodeMode }));

  app.post('/sessions', async (c) => {
    const body = (await c.req.json()) as CreateSessionInput;
    if (!body.ownerId || !body.externalRef || !body.scenario) {
      return c.json({ error: '缺少 scenario / ownerId / externalRef' }, 400);
    }
    const session = store.create({
      scenario: body.scenario,
      ownerId: body.ownerId,
      externalRef: body.externalRef,
      workspacePath: buildSessionWorkspacePath(config.workspaceRoot, ''),
    });
    const sessionWorkspacePath = buildSessionWorkspacePath(config.workspaceRoot, session.id);
    session.workspacePath = sessionWorkspacePath;
    await prepareSessionWorkspace({
      sessionWorkspacePath,
      skillsSourceDir: config.skillsSourceDir,
      meta: body.meta ?? null,
      initialModuleData: body.initialModuleData ?? null,
      moduleSlug: body.moduleSlug ?? null,
    });
    return c.json<{ session: AgentSession }>({ session }, 201);
  });

  app.get('/sessions/:id', (c) => {
    const session = store.get(c.req.param('id'));
    if (!session) {
      return c.json({ error: 'session not found' }, 404);
    }
    return c.json({ session, messages: store.listMessages(session.id) });
  });

  app.post('/sessions/:id/messages', async (c) => {
    const session = store.get(c.req.param('id'));
    if (!session) {
      return c.json({ error: 'session not found' }, 404);
    }
    const body = (await c.req.json()) as SendMessageInput;
    const content = body.content?.trim();
    if (!content) {
      return c.json({ error: '消息不能为空' }, 400);
    }

    const userMessage = buildAgentMessage({
      sessionId: session.id,
      role: 'user',
      content,
      skillCalls: [],
    });
    store.appendMessage(session.id, userMessage);

    // SSE 输出：边接 opencode 事件总线边把 text-delta / tool-call 推给 worker；
    // 最后一条 `done` 携带完整 userMessage + assistantMessage 用于持久化。
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const writeEvent = (eventType: string, data: unknown) => {
          try {
            controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`));
          } catch {
            /* controller 已 close */
          }
        };

        // 立刻发一个 ping，让 Cloudflare 看到 origin 已经响应（避免 524）
        writeEvent('ping', { ts: Date.now() });

        // 心跳每 15s 一次，长链路保活
        const heartbeat = setInterval(() => writeEvent('ping', { ts: Date.now() }), 15_000);

        try {
          const chat = await adapter.chatStream(
            {
              opencodeSessionId: session.opencodeSessionId,
              workspacePath: session.workspacePath,
              content,
              contextSummary: null,
              scenario: session.scenario,
            },
            (event) => writeEvent(event.type, event),
          );
          if (!session.opencodeSessionId) {
            store.setOpencodeSessionId(session.id, chat.opencodeSessionId);
          }

          const assistantMessage = buildAgentMessage({
            sessionId: session.id,
            role: 'assistant',
            content: chat.assistantContent,
            skillCalls: chat.skillCalls,
          });
          store.appendMessage(session.id, assistantMessage);

          const payload: SendMessageResult = { userMessage, assistantMessage };
          writeEvent('done', payload);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'agent-server 处理消息失败';
          writeEvent('error', { message });
        } finally {
          clearInterval(heartbeat);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  });

  app.get('/sessions/:id/data', async (c) => {
    const session = store.get(c.req.param('id'));
    if (!session) {
      return c.json({ error: 'session not found' }, 404);
    }
    const moduleSlug = c.req.query('moduleSlug');
    const moduleData = moduleSlug ? await readSessionModuleData(session.workspacePath, moduleSlug) : null;
    return c.json<SessionDataSnapshot>({
      sessionId: session.id,
      workspacePath: session.workspacePath,
      moduleData,
    });
  });

  app.post('/sessions/:id/publish', async (c) => {
    const session = store.get(c.req.param('id'));
    if (!session) {
      return c.json({ error: 'session not found' }, 404);
    }
    const body = (await c.req.json()) as PublishSessionInput;
    if (!body.publishedModuleId) {
      return c.json({ error: '缺少 publishedModuleId' }, 400);
    }
    const publishedWorkspacePath = buildPublishedModuleWorkspacePath(config.workspaceRoot, body.publishedModuleId);
    await publishSessionWorkspace({
      sessionWorkspacePath: session.workspacePath,
      publishedWorkspacePath,
    });
    const moduleData = (await readSessionModuleData(session.workspacePath, body.publishedModuleId)) ?? {};
    store.close(session.id);
    return c.json<PublishSessionResult>({
      publishedModuleId: body.publishedModuleId,
      publishedWorkspacePath,
      moduleData,
    });
  });

  return app;
}

function buildAdapter(config: ReturnType<typeof loadConfig>) {
  if (config.opencodeMode === 'opencode') {
    return new HttpOpencodeAdapter({ baseUrl: config.opencodeBaseUrl });
  }
  return new StubOpencodeAdapter();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = loadConfig();
  const app = createApp();
  serve({ fetch: app.fetch, hostname: config.hostname, port: config.port }, (info) => {
    console.log(`[agent-server] 监听 http://${info.address}:${info.port}（opencode 模式：${config.opencodeMode}）`);
  });
}
