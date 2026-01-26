import { NextResponse } from 'next/server';
import { generateChatCompletion, streamChatCompletion } from '../../../lib/ai/ai-provider';
import type { AiMessage, AiProvider } from '../../../lib/ai/ai-types';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import {
  createGameMessage,
  createGameMessages,
  getCharacterByIdForUser,
  getGameByIdForUser,
  getScriptById,
  getUserSettings,
  listGameMessages,
  updateGameRuleOverrides,
} from '../../../lib/db/repositories';
import { buildMessageContentFromModules, parseChatModules } from '../../../lib/game/chat-parser';
import { executeActionPlan } from '../../../lib/game/action-executor';
import { buildAnalysisPrompts, parseInputAnalysis } from '../../../lib/game/input-analyzer';
import type {
  ChatMessage,
  ChatRole,
  CharacterRecord,
  GameMessageRecord,
  ScriptDefinition,
} from '../../../lib/game/types';

type ChatRequest = {
  gameId: string;
  input: string;
};

const DEFAULT_PROVIDER: AiProvider = 'openai';
const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-5-mini',
  gemini: 'gemini-3-flash-preview',
};
const FAST_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-5-mini',
  gemini: 'gemini-3-flash-preview',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseChatRequest(body: unknown): ChatRequest | null {
  if (!isRecord(body)) {
    return null;
  }
  const gameId = typeof body.gameId === 'string' ? body.gameId.trim() : '';
  const input = typeof body.input === 'string' ? body.input.trim() : '';
  if (!gameId || !input) {
    return null;
  }
  return { gameId, input };
}

function formatTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function buildChatMessage(record: GameMessageRecord): ChatMessage {
  return {
    id: record.id,
    role: record.role,
    speaker: record.speaker,
    time: formatTime(record.createdAt),
    content: record.content,
    modules: record.modules,
  };
}

function mapRoleToAiRole(role: ChatRole): AiMessage['role'] {
  if (role === 'player') {
    return 'user';
  }
  if (role === 'system') {
    return 'system';
  }
  return 'assistant';
}

function buildHistoryMessages(messages: GameMessageRecord[]): AiMessage[] {
  return messages.map((message) => ({
    role: mapRoleToAiRole(message.role),
    content: message.content,
  }));
}

async function analyzeInput({
  provider,
  model,
  input,
  script,
  character,
}: {
  provider: AiProvider;
  model: string;
  input: string;
  script: ScriptDefinition;
  character: CharacterRecord;
}): Promise<ReturnType<typeof parseInputAnalysis>> {
  const { systemPrompt, userPrompt } = buildAnalysisPrompts(script, character, input);
  try {
    const result = await generateChatCompletion({
      provider,
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
    });
    return parseInputAnalysis(result.text, input);
  } catch {
    return parseInputAnalysis('', input);
  }
}

function buildCharacterSummary(character: CharacterRecord): string {
  const parts: string[] = [];
  parts.push(`角色：${character.name}（${character.occupation} / ${character.origin}）`);
  if (character.age.trim()) {
    parts.push(`年龄：${character.age}`);
  }
  const skillList = Object.entries(character.skills)
    .filter(([, enabled]) => enabled)
    .map(([skillId]) => skillId);
  if (skillList.length > 0) {
    parts.push(`技能：${skillList.join('、')}`);
  }
  if (character.inventory.length > 0) {
    parts.push(`装备：${character.inventory.join('、')}`);
  }
  if (character.buffs.length > 0) {
    parts.push(`Buff：${character.buffs.join('、')}`);
  }
  if (character.debuffs.length > 0) {
    parts.push(`Debuff：${character.debuffs.join('、')}`);
  }
  return parts.join('\n');
}

function buildSystemPrompt(
  script: ScriptDefinition,
  character: CharacterRecord,
  analysis: ReturnType<typeof parseInputAnalysis>,
  actionSummary: string,
): string {
  return [
    '你是“肉团长”，负责主持 COC 跑团。请用中文叙事并推动剧情。',
    `剧本：${script.title}（${script.setting} / 难度：${script.difficulty}）`,
    `简介：${script.summary}`,
    buildCharacterSummary(character),
    `玩家意图：${analysis.intent}`,
    `检定需求：${analysis.needsDice ? '是' : '否'}（${analysis.diceType}${analysis.diceTarget ? ` / ${analysis.diceTarget}` : ''}）`,
    `难度：${analysis.difficulty}`,
    `已执行动作：${actionSummary || '无'}`,
    '请按以下格式输出：',
    '【叙事】',
    '...剧情描述...',
    '【掷骰】',
    analysis.needsDice ? '...掷骰结果...' : '无',
    '【绘图】',
    '无',
    '【建议】',
    '1. ...',
    '2. ...',
    '不要输出多余的解释或前后缀。',
  ].join('\n');
}

function buildSseEvent(payload: unknown): Uint8Array {
  const text = `data: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(text);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求体不是有效的 JSON' }, { status: 400 });
  }

  const chatRequest = parseChatRequest(body);
  if (!chatRequest) {
    return NextResponse.json({ error: '请求参数不完整' }, { status: 400 });
  }

  const cookie = request.headers.get('cookie');
  if (!cookie) {
    return NextResponse.json({ error: '未登录无法聊天' }, { status: 401 });
  }

  try {
    const auth = await getAuth();
    const authSession = await auth.api.getSession({ headers: request.headers });
    if (!authSession?.user) {
      return NextResponse.json({ error: '未登录无法聊天' }, { status: 401 });
    }

    const userId = authSession.user.id;
    const db = await getDatabase();
    const game = await getGameByIdForUser(db, chatRequest.gameId, userId);
    if (!game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }
    const [script, character, settings] = await Promise.all([
      getScriptById(db, game.scriptId),
      getCharacterByIdForUser(db, game.characterId, userId),
      getUserSettings(db, userId),
    ]);
    if (!script || !character) {
      return NextResponse.json({ error: '游戏数据不完整' }, { status: 404 });
    }

    const provider = settings?.provider ?? DEFAULT_PROVIDER;
    const model = settings?.model?.trim() || DEFAULT_MODELS[provider];
    const fastModel = FAST_MODELS[provider];

    const existingMessages = await listGameMessages(db, game.id);
    if (existingMessages.length === 0 && script.openingMessages.length > 0) {
      await createGameMessages(
        db,
        script.openingMessages.map((message) => ({
          gameId: game.id,
          role: message.role,
          speaker: message.speaker ?? (message.role === 'system' ? '系统' : '肉团长'),
          content: message.content,
          modules: [{ type: 'narrative', content: message.content }],
        })),
      );
    }

    const analysis = await analyzeInput({
      provider,
      model: fastModel,
      input: chatRequest.input,
      script,
      character,
    });

    const playerSpeaker = `玩家 · ${character.name}`;
    await createGameMessage(db, {
      gameId: game.id,
      role: 'player',
      speaker: playerSpeaker,
      content: chatRequest.input,
      modules: [],
    });

    if (!analysis.allowed || analysis.intent === 'invalid') {
      const noticeText = analysis.reason || '该指令不符合当前剧本，请换一种表达方式。';
      const modules = [{ type: 'notice', content: noticeText }] as const;
      const assistantRecord = await createGameMessage(db, {
        gameId: game.id,
        role: 'system',
        speaker: '系统',
        content: noticeText,
        modules: [...modules],
      });
      return new Response(buildSseEvent({ type: 'done', message: buildChatMessage(assistantRecord) }), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const actionExecution = executeActionPlan({
      analysis,
      script,
      character,
      gameRules: game.ruleOverrides,
    });
    if (Object.keys(actionExecution.ruleUpdates).length > 0) {
      const mergedOverrides = {
        ...(game.ruleOverrides.checkDcOverrides ?? {}),
        ...actionExecution.ruleUpdates,
      };
      await updateGameRuleOverrides(db, game.id, mergedOverrides);
      game.ruleOverrides.checkDcOverrides = mergedOverrides;
    }
    const historyMessages = await listGameMessages(db, game.id);
    const recentHistory = historyMessages.slice(-18);
    const messages: AiMessage[] = [
      { role: 'system', content: buildSystemPrompt(script, character, analysis, actionExecution.summary) },
      ...buildHistoryMessages(recentHistory),
    ];

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        try {
          for await (const chunk of streamChatCompletion({
            provider,
            model,
            messages,
            temperature: 0.7,
            maxOutputTokens: 800,
          })) {
            fullText += chunk;
            controller.enqueue(buildSseEvent({ type: 'delta', text: chunk }));
          }

          const parsed = parseChatModules(fullText);
          const mergedModules =
            parsed.modules.find((module) => module.type === 'dice') || actionExecution.modules.length === 0
              ? parsed.modules
              : [...actionExecution.modules, ...parsed.modules];
          const assistantContent = buildMessageContentFromModules(mergedModules, fullText);
          const assistantRecord = await createGameMessage(db, {
            gameId: game.id,
            role: 'dm',
            speaker: '肉团长',
            content: assistantContent,
            modules: mergedModules,
          });
          controller.enqueue(buildSseEvent({ type: 'done', message: buildChatMessage(assistantRecord) }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'AI 请求失败';
          controller.enqueue(buildSseEvent({ type: 'error', error: message }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[api/chat] AI 请求失败', error);
    const message = error instanceof Error ? error.message : 'AI 请求失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
