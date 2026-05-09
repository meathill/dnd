/**
 * agent-server 与 website 之间的接口契约。
 * website 端 (Cloudflare Worker) 会以同样的形态消费。
 */

export type AgentSessionScenario = 'authoring' | 'play';

export type AgentSessionStatus = 'active' | 'closed';

export type AgentSession = {
  id: string;
  scenario: AgentSessionScenario;
  ownerId: string;
  // module_drafts.id 或 games.id
  externalRef: string;
  workspacePath: string;
  // opencode 内部的 session id
  opencodeSessionId: string | null;
  status: AgentSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AgentMessageRole = 'user' | 'assistant';

export type AgentSkillCall = {
  name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown> | string;
};

export type AgentMessage = {
  id: string;
  sessionId: string;
  role: AgentMessageRole;
  content: string;
  skillCalls: AgentSkillCall[];
  createdAt: string;
};

export type CreateSessionInput = {
  scenario: AgentSessionScenario;
  ownerId: string;
  externalRef: string;
  // 当 scenario = 'authoring' 时，传入模组 slug，会在 workspace 下建立标准目录
  moduleSlug?: string;
  // 模组初始 meta（写入 workspace/meta.json）
  meta?: Record<string, unknown>;
  // 已发布模组的内容（用于游戏会话或 import 模板）
  initialModuleData?: Record<string, unknown>;
};

export type SendMessageInput = {
  content: string;
};

export type SendMessageResult = {
  userMessage: AgentMessage;
  assistantMessage: AgentMessage;
};

export type SessionDataSnapshot = {
  sessionId: string;
  workspacePath: string;
  // 把 workspace 下的 data/modules/{slug}.json 解析回 JSON
  moduleData: Record<string, unknown> | null;
};

export type PublishSessionInput = {
  // worker 期望最终的 module slug；agent-server 会按这个把 workspace 复制到 published 目录
  publishedModuleId: string;
};

export type PublishSessionResult = {
  publishedModuleId: string;
  publishedWorkspacePath: string;
  moduleData: Record<string, unknown>;
};
