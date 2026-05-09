import { getRuntimeConfig } from '../config/runtime';
import { getCharacterById } from '../db/characters-repo';
import { getGameByIdForUser, listMessagesByGameId, recordGameTurn } from '../db/games-repo';
import { getModuleById } from '../db/modules-repo';
import { type ChatCompletionMessage, createChatCompletion } from '../llm/chat-completion';
import { buildSystemPrompt } from './dm-system-prompt';
import type { GameContext, GameRuntimeSession, GameTurnReply } from './types';

const TURN_COST = 5;

export const LOCAL_RUNTIME_SESSION_ID = 'local-runtime';

function buildContextSummary(context: GameContext): string {
  return [
    '## 当前游戏上下文',
    `游戏 ID：${context.game.id}`,
    `工作目录：${context.game.workspacePath}`,
    '### 当前模组',
    JSON.stringify(context.module, null, 2),
    '### 当前人物卡',
    JSON.stringify(context.character, null, 2),
  ].join('\n\n');
}

function buildModelMessages(context: GameContext, content: string): ChatCompletionMessage[] {
  return [
    {
      role: 'system',
      content: buildSystemPrompt({ scenario: 'play', contextSummary: buildContextSummary(context) }),
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
    `这里是统一游戏 runtime。当前模组《${moduleTitle}》，玩家角色是 ${characterName}。`,
    `你刚刚输入的是：${content}`,
    '这条回复来自 stub runtime，用于在不依赖真实模型的情况下联调游戏页面、会话链路和持久化。',
  ].join('\n\n');
}

async function recordRuntimeTurn(input: {
  context: GameContext;
  session: GameRuntimeSession;
  userContent: string;
  assistantContent: string;
  assistantMeta?: Record<string, unknown>;
}): Promise<GameTurnReply> {
  const turn = await recordGameTurn({
    userId: input.session.userId,
    gameId: input.context.game.id,
    userContent: input.userContent,
    assistantContent: input.assistantContent,
    userMeta: {
      runtime: 'game',
    },
    assistantMeta: input.assistantMeta,
    chargeAmount: TURN_COST,
    reason: `游戏回合扣费：${input.context.game.id}`,
  });

  return {
    userMessage: turn.userMessage,
    assistantMessage: turn.assistantMessage,
    balance: turn.wallet.balance,
  };
}

async function sendOpencodeRuntimeMessage(
  context: GameContext,
  session: GameRuntimeSession,
  content: string,
): Promise<GameTurnReply> {
  if (session.balance < TURN_COST) {
    throw new Error('余额不足');
  }

  const { gameLlmModel } = getRuntimeConfig();
  const completion = await createChatCompletion({
    model: gameLlmModel,
    messages: buildModelMessages(context, content),
  });

  return recordRuntimeTurn({
    context,
    session,
    userContent: content,
    assistantContent: completion.content,
    assistantMeta: {
      runtime: 'opencode',
      providerId: 'llm-upstream',
      modelId: completion.modelId,
      finishReason: completion.finishReason,
      responseId: completion.responseId,
      ...(completion.usage ? { tokens: completion.usage } : {}),
    },
  });
}

export async function getGameContext(gameId: string, userId: string): Promise<GameContext> {
  const game = await getGameByIdForUser(gameId, userId);
  if (!game) {
    throw new Error('游戏不存在');
  }

  const [moduleRecord, characterRecord, messages] = await Promise.all([
    getModuleById(game.moduleId),
    getCharacterById(game.characterId),
    listMessagesByGameId(game.id),
  ]);

  return {
    game,
    gameUrl: `/games/${game.id}`,
    module: moduleRecord,
    character: characterRecord,
    messages,
  };
}

export async function sendGameMessage(
  gameId: string,
  content: string,
  session: GameRuntimeSession,
): Promise<GameTurnReply> {
  const context = await getGameContext(gameId, session.userId);
  const { gameRuntimeMode } = getRuntimeConfig();

  if (gameRuntimeMode === 'opencode') {
    return sendOpencodeRuntimeMessage(context, session, content);
  }

  return recordRuntimeTurn({
    context,
    session,
    userContent: content,
    assistantContent: buildStubAssistantReply(context, content),
    assistantMeta: {
      runtime: 'stub',
    },
  });
}
