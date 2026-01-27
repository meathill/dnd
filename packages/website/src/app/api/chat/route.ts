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
import type { InputAnalysis } from '../../../lib/game/input-analyzer';
import { buildAnalysisPrompts, parseInputAnalysis } from '../../../lib/game/input-analyzer';
import { resolveTrainedSkillValue, resolveUntrainedSkillValue } from '../../../lib/game/rules';
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

type StatusEvent = {
  type: 'status';
  text: string;
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
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: mapRoleToAiRole(message.role),
      content: message.content,
    }));
}

function buildInvalidAnalysis(reason: string): InputAnalysis {
  return {
    allowed: false,
    reason,
    intent: 'invalid',
    needsDice: false,
    diceType: 'none',
    diceTarget: '',
    difficulty: 'normal',
    tags: [],
    actions: [],
  };
}

async function analyzeInput({
  provider,
  model,
  input,
  script,
  character,
  recentHistory,
}: {
  provider: AiProvider;
  model: string;
  input: string;
  script: ScriptDefinition;
  character: CharacterRecord;
  recentHistory?: string;
}): Promise<InputAnalysis> {
  const { systemPrompt, userPrompt } = buildAnalysisPrompts(script, character, input, recentHistory);
  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  try {
    const result = await generateChatCompletion({
      provider,
      model,
      messages,
      maxOutputTokens: 600,
    });
    let parsed = parseInputAnalysis(result.text, input);
    if (parsed.intent !== 'invalid') {
      return parsed;
    }
    console.warn('[api/chat] 意图解析失败，尝试重试。', result.text.slice(0, 400));
    const retry = await generateChatCompletion({
      provider,
      model,
      messages: [
        { role: 'system', content: `${systemPrompt}\n仅输出 JSON，对象外不要任何文字。` },
        { role: 'user', content: userPrompt },
      ],
      maxOutputTokens: 600,
    });
    parsed = parseInputAnalysis(retry.text, input);
    if (parsed.intent === 'invalid') {
      console.warn('[api/chat] 重试解析失败。', retry.text.slice(0, 400));
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : '意图解析失败';
    console.error('[api/chat] 意图解析失败', error);
    return buildInvalidAnalysis(`意图解析失败：${message}`);
  }
}

function buildRecentHistoryText(messages: GameMessageRecord[]): string {
  const visibleMessages = messages.filter((message) => message.role !== 'system');
  if (visibleMessages.length === 0) {
    return '无';
  }
  const labeled = visibleMessages.map((message) => {
    const roleLabel = message.role === 'player' ? '玩家' : '肉团长';
    return `${roleLabel}：${message.content}`;
  });
  return labeled.join('\n');
}

function buildCharacterSummary(script: ScriptDefinition, character: CharacterRecord): string {
  const parts: string[] = [];
  parts.push(`角色：${character.name}（${character.occupation} / ${character.origin}）`);
  if (character.age.trim()) {
    parts.push(`年龄：${character.age}`);
  }
  const labelMap = new Map(script.skillOptions.map((skill) => [skill.id, skill.label]));
  const trainedValue = resolveTrainedSkillValue(script.rules);
  const untrainedValue = resolveUntrainedSkillValue(script.rules);
  const skillBaseValues = script.rules.skillBaseValues ?? {};
  const skillList = Object.entries(character.skills as Record<string, unknown>)
    .map(([skillId, rawValue]) => {
      const baseValue =
        typeof skillBaseValues[skillId] === 'number' && Number.isFinite(skillBaseValues[skillId])
          ? (skillBaseValues[skillId] as number)
          : untrainedValue;
      const value =
        typeof rawValue === 'number' && Number.isFinite(rawValue) ? rawValue : rawValue ? trainedValue : baseValue;
      if (value <= baseValue) {
        return null;
      }
      return labelMap.get(skillId) ?? skillId;
    })
    .filter((item): item is string => Boolean(item));
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
    '掷骰由系统函数执行，已执行动作内包含结果，请勿自行掷骰或编造掷骰结果。',
    '准则：遵循剧本与房规优先级；保持克苏鲁氛围；每次回复简洁有推进。',
    '不要输出行动建议列表或项目符号清单，叙事中不要复述掷骰结果。',
    `剧本：${script.title}（${script.setting} / 难度：${script.difficulty}）`,
    `简介：${script.summary}`,
    buildCharacterSummary(script, character),
    `玩家意图：${analysis.intent}`,
    `检定需求：${analysis.needsDice ? '是' : '否'}（${analysis.diceType}${analysis.diceTarget ? ` / ${analysis.diceTarget}` : ''}）`,
    `难度：${analysis.difficulty}`,
    `已执行动作：${actionSummary || '无'}`,
    '请按以下格式输出：',
    '【叙事】',
    '...剧情描述...',
    '【绘图】',
    '无',
    '不要输出多余的解释或前后缀。',
  ].join('\n');
}

function buildSseEvent(payload: unknown): Uint8Array {
  const text = `data: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(text);
}

function buildStatusEvent(text: string): StatusEvent {
  return { type: 'status', text };
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

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        try {
          controller.enqueue(buildSseEvent(buildStatusEvent('理解玩家指令')));

          const playerSpeaker = `玩家 · ${character.name}`;
          await createGameMessage(db, {
            gameId: game.id,
            role: 'player',
            speaker: playerSpeaker,
            content: chatRequest.input,
            modules: [],
          });

          const historyMessages = await listGameMessages(db, game.id);
          const historyForAnalysis = historyMessages.slice(-8);
          const analysis = await analyzeInput({
            provider,
            model: fastModel,
            input: chatRequest.input,
            script,
            character,
            recentHistory: buildRecentHistoryText(historyForAnalysis),
          });

          if (!analysis.allowed || analysis.intent === 'invalid') {
            const noticeText = analysis.reason || '该指令不符合当前剧本，请换一种表达方式。';
            controller.enqueue(buildSseEvent(buildStatusEvent(`玩家指令超出可行范围：${noticeText}`)));
            const modules = [{ type: 'notice', content: noticeText }] as const;
            const assistantRecord = await createGameMessage(db, {
              gameId: game.id,
              role: 'system',
              speaker: '系统',
              content: noticeText,
              modules: [...modules],
            });
            controller.enqueue(buildSseEvent({ type: 'done', message: buildChatMessage(assistantRecord) }));
            return;
          }

          controller.enqueue(buildSseEvent(buildStatusEvent('玩家指令合法，世界因你而变')));
          controller.enqueue(buildSseEvent(buildStatusEvent('执行投骰操作')));

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

          controller.enqueue(buildSseEvent(buildStatusEvent('开始生成结果')));
          controller.enqueue(buildSseEvent(buildStatusEvent('交给通用AI大模型结合剧本生成内容')));

          const recentHistory = historyMessages.slice(-18);
          const messages: AiMessage[] = [
            { role: 'system', content: buildSystemPrompt(script, character, analysis, actionExecution.summary) },
            ...buildHistoryMessages(recentHistory),
          ];

          for await (const chunk of streamChatCompletion({
            provider,
            model,
            messages,
            maxOutputTokens: 800,
          })) {
            fullText += chunk;
            controller.enqueue(buildSseEvent({ type: 'delta', text: chunk }));
          }

          const parsed = parseChatModules(fullText);
          const filteredModules = parsed.modules.filter(
            (module) => module.type !== 'dice' && module.type !== 'suggestions',
          );
          const mergedModules =
            actionExecution.modules.length > 0 ? [...actionExecution.modules, ...filteredModules] : filteredModules;
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
