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

    const chat = await adapter.chat({
      opencodeSessionId: session.opencodeSessionId,
      workspacePath: session.workspacePath,
      content,
      contextSummary: null,
      scenario: session.scenario,
    });
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

    return c.json<SendMessageResult>({ userMessage, assistantMessage });
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
