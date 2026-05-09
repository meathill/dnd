import { randomUUID } from 'node:crypto';
import type { AgentMessage, AgentSession, AgentSessionScenario } from './types.ts';

/**
 * 内存级 session store。MVP 阶段够用，重启会丢失会话索引；
 * workspace 文件本身仍在磁盘上，重启后只要 worker 不再调旧 sessionId 就没问题。
 * 后续可以替换成 sqlite。
 */
export class SessionStore {
  private readonly sessions = new Map<string, AgentSession>();
  private readonly messages = new Map<string, AgentMessage[]>();

  create(input: {
    scenario: AgentSessionScenario;
    ownerId: string;
    externalRef: string;
    workspacePath: string;
  }): AgentSession {
    const now = new Date().toISOString();
    const session: AgentSession = {
      id: randomUUID(),
      scenario: input.scenario,
      ownerId: input.ownerId,
      externalRef: input.externalRef,
      workspacePath: input.workspacePath,
      opencodeSessionId: null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(session.id, session);
    this.messages.set(session.id, []);
    return session;
  }

  get(sessionId: string): AgentSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  setOpencodeSessionId(sessionId: string, opencodeSessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.opencodeSessionId = opencodeSessionId;
    session.updatedAt = new Date().toISOString();
  }

  appendMessage(sessionId: string, message: AgentMessage): void {
    const list = this.messages.get(sessionId);
    if (!list) {
      this.messages.set(sessionId, [message]);
      return;
    }
    list.push(message);
  }

  listMessages(sessionId: string): AgentMessage[] {
    return this.messages.get(sessionId) ?? [];
  }

  close(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.status = 'closed';
    session.updatedAt = new Date().toISOString();
  }
}
