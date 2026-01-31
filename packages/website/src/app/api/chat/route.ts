import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { generateChatCompletion, streamChatCompletion } from '../../../lib/ai/ai-provider';
import type { AiMessage, AiProvider } from '../../../lib/ai/ai-types';
import { getAuth } from '../../../lib/auth/auth';
import { getDatabase } from '../../../lib/db/db';
import {
  createGameMessage,
  createGameMessages,
  getActiveDmProfile,
  getCharacterByIdForUser,
  getGameByIdForUser,
  getScriptById,
  getUserSettings,
  listGameMessages,
  updateGameRuleOverrides,
} from '../../../lib/db/repositories';
import { DEFAULT_ANALYSIS_GUIDE, DEFAULT_NARRATION_GUIDE, buildFallbackDmProfile } from '../../../lib/game/dm-profiles';
import { buildMessageContentFromModules, parseChatModules } from '../../../lib/game/chat-parser';
import { executeActionPlan } from '../../../lib/game/action-executor';
import type { InputAnalysis } from '../../../lib/game/input-analyzer';
import { buildAnalysisPrompts, parseInputAnalysis } from '../../../lib/game/input-analyzer';
import { buildMemoryContext } from '../../../lib/game/memory';
import { refreshGameMemory } from '../../../lib/game/memory-updater';
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
  history?: ChatHistoryEntry[];
};

type StatusEvent = {
  type: 'status';
  text: string;
};

type ChatHistoryEntry = {
  role: ChatRole;
  content: string;
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
  const history = parseHistoryEntries(body.history);
  return { gameId, input, history: history.length > 0 ? history : undefined };
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

function buildHistoryMessages(messages: ChatHistoryEntry[]): AiMessage[] {
  return messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: mapRoleToAiRole(message.role),
      content: message.content,
    }));
}

function mapRecordsToHistory(messages: GameMessageRecord[]): ChatHistoryEntry[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function parseHistoryEntries(raw: unknown): ChatHistoryEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const entries: ChatHistoryEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const record = item as Record<string, unknown>;
    const role = typeof record.role === 'string' ? record.role.trim() : '';
    const content = typeof record.content === 'string' ? record.content.trim() : '';
    if (!content) {
      continue;
    }
    if (role === 'player' || role === 'dm' || role === 'system') {
      entries.push({ role, content });
    }
  }
  return entries;
}

function ensureHistoryIncludesInput(history: ChatHistoryEntry[], input: string): ChatHistoryEntry[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return history;
  }
  const last = history[history.length - 1];
  if (!last || last.role !== 'player' || last.content.trim() !== trimmed) {
    return [...history, { role: 'player', content: trimmed }];
  }
  return history;
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
  analysisGuide,
  memoryContext,
}: {
  provider: AiProvider;
  model: string;
  input: string;
  script: ScriptDefinition;
  character: CharacterRecord;
  recentHistory?: string;
  analysisGuide?: string;
  memoryContext?: string;
}): Promise<InputAnalysis> {
  const { systemPrompt, userPrompt } = buildAnalysisPrompts(
    script,
    character,
    input,
    recentHistory,
    analysisGuide,
    memoryContext,
  );
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

function buildRecentHistoryText(messages: ChatHistoryEntry[]): string {
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
  narrationGuide: string,
  memoryContext: string,
): string {
  const guideText = narrationGuide.trim();
  const promptParts = [
    '你是“肉团长”，负责主持 COC 跑团。请用中文叙事并推动剧情。',
    '掷骰由系统函数执行，已执行动作内包含结果，请勿自行掷骰或编造掷骰结果。',
    '准则：遵循剧本与房规优先级；保持克苏鲁氛围；每次回复简洁有推进。',
    '不要输出行动建议列表或项目符号清单，叙事中不要复述掷骰结果。',
    `剧本：${script.title}（${script.setting} / 难度：${script.difficulty}）`,
    `简介：${script.summary}`,
    buildCharacterSummary(script, character),
    memoryContext ? `历史摘要与世界状态：\n${memoryContext}` : '历史摘要与世界状态：无',
    `玩家意图：${analysis.intent}`,
    `检定需求：${analysis.needsDice ? '是' : '否'}（${analysis.diceType}${analysis.diceTarget ? ` / ${analysis.diceTarget}` : ''}）`,
    `难度：${analysis.difficulty}`,
    `已执行动作：${actionSummary || '无'}`,
    '请按以下格式输出：',
    '【叙事】',
    '...剧情描述...',
    '【绘图】',
    '使用 ASCII/emoji 简要呈现位置关系与周边环境，控制在 40 列以内；若无需更新则写“无”。',
    '不要输出多余的解释或前后缀。',
  ];
  if (guideText) {
    promptParts.splice(4, 0, guideText);
  }
  return promptParts.join('\n');
}

function buildSseEvent(payload: unknown): Uint8Array {
  const text = `data: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(text);
}

function buildStatusEvent(text: string): StatusEvent {
  return { type: 'status', text };
}

async function scheduleMemoryRefresh(task: () => Promise<void>) {
  try {
    const context = await getCloudflareContext({ async: true });
    if (context?.ctx?.waitUntil) {
      context.ctx.waitUntil(task());
      return;
    }
  } catch {
    // ignore
  }
  void task();
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
    const dmProfile = (await getActiveDmProfile(db, settings?.dmProfileId)) ?? buildFallbackDmProfile();
    const analysisGuide = dmProfile.analysisGuide || DEFAULT_ANALYSIS_GUIDE;
    const narrationGuide = dmProfile.narrationGuide || DEFAULT_NARRATION_GUIDE;

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
    let activeCharacter = character;
    let memoryContext = '无';
    try {
      const memoryResult = await refreshGameMemory({
        db,
        provider,
        model: fastModel,
        gameId: game.id,
        script,
        character,
      });
      activeCharacter = memoryResult.character;
      memoryContext = buildMemoryContext(memoryResult.memory.shortSummary, memoryResult.memory.state);
    } catch (error) {
      console.warn('[api/chat] 记忆刷新失败', error);
    }

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        try {
          controller.enqueue(buildSseEvent(buildStatusEvent('理解玩家指令')));

          const playerSpeaker = `玩家 · ${activeCharacter.name}`;
          await createGameMessage(db, {
            gameId: game.id,
            role: 'player',
            speaker: playerSpeaker,
            content: chatRequest.input,
            modules: [],
          });

          const historySource = chatRequest.history?.length
            ? ensureHistoryIncludesInput(chatRequest.history, chatRequest.input)
            : mapRecordsToHistory(await listGameMessages(db, game.id));
          const historyForAnalysis = historySource.slice(-8);
          const analysis = await analyzeInput({
            provider,
            model: fastModel,
            input: chatRequest.input,
            script,
            character: activeCharacter,
            recentHistory: buildRecentHistoryText(historyForAnalysis),
            analysisGuide,
            memoryContext,
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
            character: activeCharacter,
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

          const recentHistory = historySource.slice(-18);
          const messages: AiMessage[] = [
            {
              role: 'system',
              content: buildSystemPrompt(
                script,
                activeCharacter,
                analysis,
                actionExecution.summary,
                narrationGuide,
                memoryContext,
              ),
            },
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
          await scheduleMemoryRefresh(async () => {
            try {
              await refreshGameMemory({
                db,
                provider,
                model: fastModel,
                gameId: game.id,
                script,
                character: activeCharacter,
              });
            } catch (error) {
              console.warn('[api/chat] 记忆更新失败', error);
            }
          });
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
