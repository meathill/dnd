import { getPlayRuntimeConfig } from '../config/runtime';
import { getDmSystemPrompt } from './dm-system-prompt';
import type { GameContext, PlayReply, SessionInfo } from './types';
import type { ChatCompletionMessage } from './website-client';
import {
  fetchWebsiteGameContext,
  fetchWebsiteGameContextAsInternal,
  recordWebsiteTurnAsInternal,
  sendWebsiteChatCompletion,
  sendWebsiteGameMessage,
  sendWebsiteGameMessageAsInternal,
} from './website-client';

const TURN_COST = 5;

function buildModelSystemPrompt(context: GameContext, systemPrompt: string): string {
  return [
    systemPrompt.trim(),
    '## 当前游戏上下文',
    `游戏 ID：${context.game.id}`,
    `工作目录：${context.game.workspacePath}`,
    '### 当前模组',
    JSON.stringify(context.module, null, 2),
    '### 当前人物卡',
    JSON.stringify(context.character, null, 2),
  ].join('\n\n');
}

function buildModelMessages(context: GameContext, systemPrompt: string, content: string): ChatCompletionMessage[] {
  return [
    {
      role: 'system',
      content: buildModelSystemPrompt(context, systemPrompt),
    },
    ...context.messages
      .filter((message) => (message.role === 'user' || message.role === 'assistant') && message.content.trim())
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      })),
    {
      role: 'user',
      content,
    },
  ];
}

function buildStubAssistantReply(context: GameContext, content: string): string {
  const moduleTitle = context.module?.title || '未知模组';
  const characterName = context.character?.name || '未知调查员';
  return [
    `这里是 play stub runtime。当前模组《${moduleTitle}》，玩家角色是 ${characterName}。`,
    `你刚刚输入的是：${content}`,
    '这条回复来自 stub runtime，用于在不依赖 opencode 的情况下联调 play 服务、会话链路和前端交互。',
  ].join('\n\n');
}

function buildStubReply(
  context: GameContext,
  content: string,
): {
  assistantContent: string;
} {
  const assistantContent = buildStubAssistantReply(context, content);
  return {
    assistantContent,
  };
}

async function completeTurnThroughWebsite(input: {
  gameContext: GameContext;
  session: SessionInfo;
  cookieHeader?: string | null;
  userContent: string;
  assistantContent: string;
  assistantMeta?: Record<string, unknown>;
}): Promise<PlayReply> {
  return recordWebsiteTurnAsInternal({
    gameId: input.gameContext.game.id,
    userId: input.session.userId,
    balance: input.session.balance,
    cookieHeader: input.cookieHeader,
    userContent: input.userContent,
    assistantContent: input.assistantContent,
    assistantMeta: input.assistantMeta,
    chargeAmount: TURN_COST,
    chargeReason: `游戏回合扣费：${input.gameContext.game.id}`,
  });
}

async function sendOpencodeRuntimeMessage(input: {
  context: GameContext;
  session: SessionInfo;
  content: string;
  cookieHeader?: string | null;
}): Promise<PlayReply> {
  if (input.session.balance < TURN_COST) {
    throw new Error('余额不足');
  }

  const systemPrompt = getDmSystemPrompt();
  const { llmModel } = getPlayRuntimeConfig();
  const completion = await sendWebsiteChatCompletion({
    userId: input.session.userId,
    gameId: input.context.game.id,
    model: llmModel,
    messages: buildModelMessages(input.context, systemPrompt, input.content),
  });

  return completeTurnThroughWebsite({
    gameContext: input.context,
    session: input.session,
    cookieHeader: input.cookieHeader,
    userContent: input.content,
    assistantContent: completion.content,
    assistantMeta: {
      runtime: 'opencode',
      providerId: 'llmproxy',
      modelId: completion.modelId,
      finishReason: completion.finishReason,
      responseId: completion.responseId,
      ...(completion.usage ? { tokens: completion.usage } : {}),
    },
  });
}

export async function getPlayGameContext(
  gameId: string,
  session: SessionInfo,
  cookieHeader?: string | null,
): Promise<GameContext> {
  if (cookieHeader) {
    return fetchWebsiteGameContext(gameId, cookieHeader);
  }
  return fetchWebsiteGameContextAsInternal({
    gameId,
    userId: session.userId,
    balance: session.balance,
  });
}

export async function sendPlayMessage(
  gameId: string,
  content: string,
  session: SessionInfo,
  cookieHeader?: string | null,
): Promise<PlayReply> {
  const { runtimeMode } = getPlayRuntimeConfig();
  if (runtimeMode === 'website') {
    if (cookieHeader) {
      return sendWebsiteGameMessage(gameId, content, cookieHeader);
    }
    return sendWebsiteGameMessageAsInternal({
      gameId,
      userId: session.userId,
      balance: session.balance,
      content,
    });
  }
  const context = await getPlayGameContext(gameId, session, cookieHeader);
  if (runtimeMode === 'opencode') {
    return sendOpencodeRuntimeMessage({
      context,
      session,
      content,
      cookieHeader,
    });
  }
  const stub = buildStubReply(context, content);
  return completeTurnThroughWebsite({
    gameContext: context,
    session,
    cookieHeader,
    userContent: content,
    assistantContent: stub.assistantContent,
    assistantMeta: {
      runtime: 'stub',
    },
  });
}
