import { AgentServerUnavailableError, isAgentServerConfigured, sendAgentMessage } from '../agent/client';
import { type CreateDraftMessageInput, createModuleDraftMessage } from '../db/module-drafts-repo';
import type { ModuleDraftMessageRecord, ModuleDraftRecord } from './types';

export type AuthoringTurnInput = {
  draft: ModuleDraftRecord;
  content: string;
};

export type AuthoringTurnResult = {
  userMessage: ModuleDraftMessageRecord;
  assistantMessage: ModuleDraftMessageRecord;
};

function buildStubAssistantReply(draft: ModuleDraftRecord, content: string): string {
  return [
    `这里是模组创作 stub runtime（agent-server 未配置）。当前模组《${draft.title}》（slug: ${draft.slug}）。`,
    `editor 输入：${content}`,
    '在 wrangler.jsonc 配置 OPENCODE_AGENT_BASE_URL 与 OPENCODE_AGENT_TOKEN 后，会调用 VPS 上的 opencode agent loop。',
  ].join('\n\n');
}

export async function sendAuthoringMessage(input: AuthoringTurnInput): Promise<AuthoringTurnResult> {
  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new Error('消息不能为空');
  }

  const baseUserPayload: CreateDraftMessageInput = {
    moduleDraftId: input.draft.id,
    role: 'user',
    content: trimmed,
    meta: { runtime: 'authoring' },
  };
  const userMessage = await createModuleDraftMessage(baseUserPayload);

  let assistantContent: string;
  let assistantMeta: Record<string, unknown>;

  if (input.draft.agentSessionId && (await isAgentServerConfigured())) {
    try {
      const result = await sendAgentMessage(input.draft.agentSessionId, trimmed);
      assistantContent = result.assistantMessage.content;
      assistantMeta = {
        runtime: 'agent-server',
        agentMessageId: result.assistantMessage.id,
        skillCalls: result.assistantMessage.skillCalls,
      };
    } catch (error) {
      if (error instanceof AgentServerUnavailableError) {
        assistantContent = buildStubAssistantReply(input.draft, trimmed);
        assistantMeta = { runtime: 'stub', reason: 'agent-server-unavailable' };
      } else {
        const message = error instanceof Error ? error.message : '调用 agent-server 失败';
        throw new Error(message);
      }
    }
  } else {
    assistantContent = buildStubAssistantReply(input.draft, trimmed);
    assistantMeta = { runtime: 'stub' };
  }

  const assistantMessage = await createModuleDraftMessage({
    moduleDraftId: input.draft.id,
    role: 'assistant',
    content: assistantContent,
    meta: assistantMeta,
  });

  return { userMessage, assistantMessage };
}
