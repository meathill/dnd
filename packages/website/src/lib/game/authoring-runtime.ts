import { getRuntimeConfig } from '../config/runtime';
import {
  type CreateDraftMessageInput,
  createModuleDraftMessage,
  listModuleDraftMessages,
} from '../db/module-drafts-repo';
import { type ChatCompletionMessage, createChatCompletion } from '../llm/chat-completion';
import { buildSystemPrompt } from './dm-system-prompt';
import type { ModuleDraftMessageRecord, ModuleDraftRecord } from './types';

export type AuthoringTurnInput = {
  draft: ModuleDraftRecord;
  content: string;
};

export type AuthoringTurnResult = {
  userMessage: ModuleDraftMessageRecord;
  assistantMessage: ModuleDraftMessageRecord;
};

function buildContextSummary(draft: ModuleDraftRecord): string {
  return [
    '## 当前模组草稿',
    `slug：${draft.slug}`,
    `标题：${draft.title}`,
    `工作目录：${draft.workspacePath}`,
    '### Meta',
    JSON.stringify(draft.meta, null, 2),
    '### 当前 data 概览',
    JSON.stringify(draft.data, null, 2),
  ].join('\n\n');
}

function toChatMessage(record: ModuleDraftMessageRecord): ChatCompletionMessage {
  return { role: record.role, content: record.content };
}

function buildStubAssistantReply(draft: ModuleDraftRecord, content: string): string {
  return [
    `这里是模组创作 stub runtime。当前模组《${draft.title}》（slug: ${draft.slug}）。`,
    `editor 输入：${content}`,
    '在生产环境配置 GAME_RUNTIME=opencode 后，会调用 LLM 并按 create_module skill 流程协作。',
  ].join('\n\n');
}

export async function sendAuthoringMessage(input: AuthoringTurnInput): Promise<AuthoringTurnResult> {
  const trimmed = input.content.trim();
  if (!trimmed) {
    throw new Error('消息不能为空');
  }
  const history = await listModuleDraftMessages(input.draft.id);

  const baseUserPayload: CreateDraftMessageInput = {
    moduleDraftId: input.draft.id,
    role: 'user',
    content: trimmed,
    meta: { runtime: 'authoring' },
  };
  const userMessage = await createModuleDraftMessage(baseUserPayload);

  const { gameRuntimeMode, gameLlmModel } = getRuntimeConfig();
  let assistantContent: string;
  let assistantMeta: Record<string, unknown>;
  if (gameRuntimeMode === 'opencode') {
    const completion = await createChatCompletion({
      model: gameLlmModel,
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt({ scenario: 'authoring', contextSummary: buildContextSummary(input.draft) }),
        },
        ...history.map(toChatMessage),
        { role: 'user', content: trimmed },
      ],
    });
    assistantContent = completion.content;
    assistantMeta = {
      runtime: 'authoring',
      providerId: 'llm-upstream',
      modelId: completion.modelId,
      finishReason: completion.finishReason,
      responseId: completion.responseId,
      ...(completion.usage ? { tokens: completion.usage } : {}),
    };
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
