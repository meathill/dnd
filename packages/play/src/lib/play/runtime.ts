import { randomUUID } from 'node:crypto';
import { getPlayRuntimeConfig } from '../config/runtime';
import {
  fetchWebsiteGameContext,
  fetchWebsiteGameContextAsInternal,
  sendWebsiteGameMessage,
  sendWebsiteGameMessageAsInternal,
} from './website-client';
import type { GameContext, GameMessageRecord, PlayReply, SessionInfo } from './types';

const STUB_TURN_COST = 5;

function buildStubAssistantReply(context: GameContext, content: string): string {
  const moduleTitle = context.module?.title || '未知模组';
  const characterName = context.character?.name || '未知调查员';
  return [
    `这里是 play stub runtime。当前模组《${moduleTitle}》，玩家角色是 ${characterName}。`,
    `你刚刚输入的是：${content}`,
    '这条回复来自 stub runtime，用于在不依赖 opencode 的情况下联调 play 服务、会话链路和前端交互。',
  ].join('\n\n');
}

function buildStubReply(context: GameContext, content: string): PlayReply {
  const createdAt = new Date().toISOString();
  const userMessage: GameMessageRecord = {
    id: randomUUID(),
    gameId: context.game.id,
    role: 'user',
    content,
    meta: {
      runtime: 'stub',
    },
    createdAt,
  };
  const assistantMessage: GameMessageRecord = {
    id: randomUUID(),
    gameId: context.game.id,
    role: 'assistant',
    content: buildStubAssistantReply(context, content),
    meta: {
      runtime: 'stub',
    },
    createdAt: new Date(Date.now() + 1).toISOString(),
  };
  return {
    userMessage,
    assistantMessage,
    balance: Math.max(0, 100 - STUB_TURN_COST),
  };
}

export async function getPlayGameContext(gameId: string, session: SessionInfo, cookieHeader?: string | null): Promise<GameContext> {
  if (cookieHeader) {
    return fetchWebsiteGameContext(gameId, cookieHeader);
  }
  return fetchWebsiteGameContextAsInternal({
    gameId,
    userId: session.userId,
    balance: session.balance,
  });
}

export async function sendPlayMessage(gameId: string, content: string, session: SessionInfo, cookieHeader?: string | null): Promise<PlayReply> {
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
  if (runtimeMode === 'opencode') {
    throw new Error('opencode runtime 尚未接入');
  }
  const context = await getPlayGameContext(gameId, session, cookieHeader);
  return buildStubReply(context, content);
}
