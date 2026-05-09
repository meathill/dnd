import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { StubOpencodeAdapter } from './opencode-client.ts';
import { createApp } from './server.ts';
import { SessionStore } from './sessions.ts';

let workspaceDir = '';
let skillsDir = '';

beforeEach(async () => {
  workspaceDir = await mkdtemp(join(tmpdir(), 'agent-ws-'));
  skillsDir = await mkdtemp(join(tmpdir(), 'agent-skills-'));
  process.env.AGENT_SERVER_TOKEN = 'test-token';
  process.env.AGENT_WORKSPACE_ROOT = workspaceDir;
  process.env.AGENT_SKILLS_DIR = skillsDir;
  process.env.OPENCODE_MODE = 'stub';
});

afterEach(async () => {
  Reflect.deleteProperty(process.env, 'AGENT_SERVER_TOKEN');
  Reflect.deleteProperty(process.env, 'AGENT_WORKSPACE_ROOT');
  Reflect.deleteProperty(process.env, 'AGENT_SKILLS_DIR');
  Reflect.deleteProperty(process.env, 'OPENCODE_MODE');
  await rm(workspaceDir, { recursive: true, force: true });
  await rm(skillsDir, { recursive: true, force: true });
});

function authedRequest(path: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set('Authorization', 'Bearer test-token');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return new Request(`http://localhost${path}`, { ...init, headers });
}

describe('agent-server', () => {
  it('rejects requests without bearer token', async () => {
    const app = createApp({ store: new SessionStore(), adapter: new StubOpencodeAdapter() });
    const response = await app.fetch(new Request('http://localhost/sessions', { method: 'POST' }));
    expect(response.status).toBe(401);
  });

  it('allows /healthz without auth', async () => {
    const app = createApp({ store: new SessionStore(), adapter: new StubOpencodeAdapter() });
    const response = await app.fetch(new Request('http://localhost/healthz'));
    expect(response.status).toBe(200);
  });

  it('creates session, sends message, and reads back history', async () => {
    const app = createApp({ store: new SessionStore(), adapter: new StubOpencodeAdapter() });

    const created = await app.fetch(
      authedRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          scenario: 'authoring',
          ownerId: 'user-1',
          externalRef: 'draft-1',
          moduleSlug: 'haunted',
          meta: { ruleset: 'coc-7e-lite' },
        }),
      }),
    );
    expect(created.status).toBe(201);
    const { session } = (await created.json()) as { session: { id: string; workspacePath: string } };
    expect(session.id).toBeTypeOf('string');
    expect(session.workspacePath).toContain(session.id);

    const sent = await app.fetch(
      authedRequest(`/sessions/${session.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: '帮我先列出 Meta' }),
      }),
    );
    expect(sent.status).toBe(200);
    const sendPayload = (await sent.json()) as {
      userMessage: { role: string };
      assistantMessage: { role: string; content: string };
    };
    expect(sendPayload.userMessage.role).toBe('user');
    expect(sendPayload.assistantMessage.role).toBe('assistant');
    expect(sendPayload.assistantMessage.content).toContain('stub agent');

    const detail = await app.fetch(authedRequest(`/sessions/${session.id}`));
    const detailPayload = (await detail.json()) as { messages: Array<{ role: string }> };
    expect(detailPayload.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
  });

  it('publish endpoint copies workspace and returns module data', async () => {
    const app = createApp({ store: new SessionStore(), adapter: new StubOpencodeAdapter() });
    const created = await app.fetch(
      authedRequest('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          scenario: 'authoring',
          ownerId: 'user-1',
          externalRef: 'draft-1',
          moduleSlug: 'haunted',
          initialModuleData: { id: 'haunted', title: '荒宅', summary: '', setting: '', difficulty: '中等' },
        }),
      }),
    );
    const { session } = (await created.json()) as { session: { id: string } };

    const publish = await app.fetch(
      authedRequest(`/sessions/${session.id}/publish`, {
        method: 'POST',
        body: JSON.stringify({ publishedModuleId: 'haunted' }),
      }),
    );
    expect(publish.status).toBe(200);
    const result = (await publish.json()) as { publishedModuleId: string; moduleData: { title: string } };
    expect(result.publishedModuleId).toBe('haunted');
    expect(result.moduleData.title).toBe('荒宅');
  });
});
