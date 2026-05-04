import type { AssistantMessage, Part, Session } from '@opencode-ai/sdk';
import { createGameMessage, findGameMessageByMeta } from '../db/repositories';
import type { CharacterRecord, GameRecord, ModuleRecord } from '../game/types';
import { getOpencodeClient } from './client';

export type OpencodeReply = {
  sessionId: string;
  assistantMessage: AssistantMessage | null;
  content: string;
  parts: Part[];
};

function extractText(parts: Part[]): string {
  return parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

function buildBootstrapPrompt(moduleRecord: ModuleRecord, characterRecord: CharacterRecord, workspacePath: string): string {
  return [
    '你现在负责主持本局跑团。',
    `当前工作目录：${workspacePath}`,
    '本局模组详情如下：',
    JSON.stringify(moduleRecord.data, null, 2),
    '当前玩家人物卡如下：',
    JSON.stringify(characterRecord.data, null, 2),
    '请使用当前项目已经提供好的 skills，并在这个工作目录中完成本局游戏相关工作。',
  ].join('\n\n');
}

export async function createGameplaySession(input: {
  title: string;
  workspacePath: string;
  moduleRecord: ModuleRecord;
  characterRecord: CharacterRecord;
  systemPrompt: string;
}): Promise<Session> {
  const client = getOpencodeClient(input.workspacePath);
  const created = await client.session.create({
    body: { title: input.title },
  });
  const session = created.data;
  if (!session) {
    throw new Error('创建 opencode session 失败');
  }
  await client.session.prompt({
    path: { id: session.id },
    body: {
      noReply: true,
      system: input.systemPrompt,
      parts: [
        {
          type: 'text',
          text: buildBootstrapPrompt(input.moduleRecord, input.characterRecord, input.workspacePath),
        },
      ],
    },
  });
  return session;
}

export async function sendGameplayMessage(input: {
  game: GameRecord;
  content: string;
  systemPrompt: string;
}): Promise<OpencodeReply> {
  const client = getOpencodeClient(input.game.workspacePath);
  const result = await client.session.prompt({
    path: { id: input.game.opencodeSessionId },
    body: {
      system: input.systemPrompt,
      parts: [{ type: 'text', text: input.content }],
    },
  });
  const payload = result.data;
  if (!payload) {
    throw new Error('opencode 未返回消息');
  }
  const content = extractText(payload.parts);
  if (!content) {
    throw new Error('opencode 未返回文本消息');
  }
  return {
    sessionId: input.game.opencodeSessionId,
    assistantMessage: payload.info,
    content,
    parts: payload.parts,
  };
}

export async function syncSessionMessages(game: GameRecord): Promise<void> {
  const client = getOpencodeClient(game.workspacePath);
  const result = await client.session.messages({ path: { id: game.opencodeSessionId } });
  const messages = result.data ?? [];
  for (const entry of messages) {
    if (entry.info.role !== 'assistant') {
      continue;
    }
    const content = extractText(entry.parts);
    if (!content) {
      continue;
    }
    const existing = await findGameMessageByMeta(game.id, 'opencodeMessageId', entry.info.id);
    if (existing) {
      continue;
    }
    await createGameMessage({
      gameId: game.id,
      role: 'assistant',
      content,
      meta: {
        opencodeMessageId: entry.info.id,
        providerId: entry.info.providerID,
        modelId: entry.info.modelID,
        cost: entry.info.cost,
      },
    });
  }
}
