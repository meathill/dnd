import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import OpenAI from 'openai';
import {
  run,
  setDefaultOpenAIClient,
  setTracingDisabled,
  RunItemStreamEvent,
  RunRawModelStreamEvent,
  RunToolCallItem,
  RunToolCallOutputItem,
} from '@openai/agents';
import { dmAgent, type GameAgentContext } from '@/lib/ai/dm-agent';
import { getAuth } from '@/lib/auth/auth';
import { getDatabase } from '@/lib/db/db';
import {
  createGameMessage,
  createGameMessages,
  findAiModelByLookup,
  getActiveDmProfile,
  getCharacterByIdForUser,
  getGameByIdForUser,
  getScriptById,
  getUserSettings,
  listGameMessages,
} from '@/lib/db/repositories';
import { DEFAULT_NARRATION_GUIDE, buildFallbackDmProfile } from '@/lib/game/dm-profiles';
import { parseChatModules, buildMessageContentFromModules } from '@/lib/game/chat-parser';
import { buildMemoryContext } from '@/lib/game/memory';
import { refreshGameMemory } from '@/lib/game/memory-updater';
import type { ChatMessage, ChatRole, CharacterRecord, GameMessageRecord, ScriptDefinition } from '@/lib/game/types';

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

function mapRecordsToHistory(messages: GameMessageRecord[]): ChatHistoryEntry[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function buildSseEvent(payload: unknown): Uint8Array {
  const text = `data: ${JSON.stringify(payload)}\n\n`;
  return new TextEncoder().encode(text);
}

function buildStatusEvent(text: string): StatusEvent {
  return { type: 'status', text };
}

// 将对话历史转换为 @openai/agents 需要的输入格式
function buildAgentInput(history: ChatHistoryEntry[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  return history
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: (message.role === 'player' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: message.content,
    }));
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

    const dmProfile = (await getActiveDmProfile(db, settings?.dmProfileId)) ?? buildFallbackDmProfile();
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
        provider: 'openai',
        model: settings?.fastModel || 'gpt-5-mini',
        gameId: game.id,
        script,
        character,
      });
      activeCharacter = memoryResult.character;
      memoryContext = buildMemoryContext(memoryResult.memory.shortSummary, memoryResult.memory.state);
    } catch (error) {
      console.warn('[api/chat] 记忆刷新失败', error);
    }

    // ==========================================
    // 配置 OpenAI Client 给 @openai/agents 使用
    // 优先使用 ai_models 表中匹配 general 模型的自定义 baseURL/apiKey，
    // 否则回落到环境变量 OPENAI_API_KEY / OPENAI_BASE_URL。
    // ==========================================
    const { env } = await getCloudflareContext({ async: true });
    const generalModelId = settings?.generalModel?.trim() || '';
    const customModel = generalModelId
      ? await findAiModelByLookup(db, 'openai', 'general', generalModelId)
      : null;
    const envRecord = env as unknown as Record<string, string | undefined>;
    const openaiClient = new OpenAI({
      apiKey: customModel?.apiKey || envRecord.OPENAI_API_KEY || '',
      baseURL: customModel?.baseUrl || envRecord.OPENAI_BASE_URL || undefined,
    });
    setDefaultOpenAIClient(openaiClient);
    // Edge 环境不需要追踪，关闭避免不必要的网络请求
    setTracingDisabled(true);

    // ==========================================
    // 构建 Agent 运行上下文
    // ==========================================
    const imageModel =
      (env as unknown as Record<string, string | undefined>).OPENAI_IMAGE_MODEL || 'gpt-image-2';
    const agentContext: GameAgentContext = {
      script,
      character: activeCharacter,
      gameRules: game.ruleOverrides,
      memoryContext,
      narrationGuide,
      generateImage: async ({ prompt, size }) => {
        const response = await openaiClient.images.generate({
          model: imageModel,
          prompt,
          size,
          n: 1,
        });
        const item = response.data?.[0];
        return {
          b64: item?.b64_json,
          url: item?.url,
        };
      },
    };

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = '';
        const diceResults: string[] = [];
        try {
          controller.enqueue(buildSseEvent(buildStatusEvent('DM 正在思考...')));

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
          const recentHistory = historySource.slice(-18);
          const agentInput = buildAgentInput(recentHistory);

          // ==========================================
          // 使用 @openai/agents Runner 流式运行 DM Agent
          // ==========================================
          controller.enqueue(buildSseEvent(buildStatusEvent('肉团长正在展开叙事...')));

          const result = await run(dmAgent, agentInput as unknown as Parameters<typeof run>[1], {
            context: agentContext,
            stream: true,
            maxTurns: 8,
          });

          for await (const event of result) {
            if (event instanceof RunRawModelStreamEvent) {
              // 原始文本 delta —— 流式推送给前端
              const rawEvent = event.data as Record<string, unknown>;
              const choices = rawEvent?.choices as Array<{ delta?: { content?: string } }> | undefined;
              const delta = choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(buildSseEvent({ type: 'delta', text: delta }));
              }
            } else if (event instanceof RunItemStreamEvent) {
              const item = event.item;
              if (item instanceof RunToolCallItem) {
                // Agent 决定调用工具 —— 通知前端展示 ToolCard
                const raw = item.rawItem as { name?: string; arguments?: string; callId?: string; call_id?: string };
                const toolName = raw.name ?? 'unknown';
                const callId = raw.callId ?? raw.call_id ?? `${toolName}-${Date.now()}`;
                controller.enqueue(
                  buildSseEvent({
                    type: 'status',
                    text: `执行检定：${toolName}`,
                  }),
                );
                controller.enqueue(
                  buildSseEvent({
                    type: 'tool_call',
                    callId,
                    name: toolName,
                    arguments: raw.arguments ?? '{}',
                  }),
                );
              } else if (item instanceof RunToolCallOutputItem) {
                // 工具执行完毕 —— 通知前端展示结果
                const raw = item.rawItem as { callId?: string; call_id?: string; name?: string };
                const callId = raw.callId ?? raw.call_id ?? raw.name ?? 'unknown';
                const output = typeof item.output === 'string' ? item.output : JSON.stringify(item.output);
                diceResults.push(output);
                controller.enqueue(
                  buildSseEvent({
                    type: 'tool_result',
                    callId,
                    result: output,
                  }),
                );
              }
            }
          }

          // ==========================================
          // 保存 DM 回复到数据库
          // ==========================================
          const parsed = parseChatModules(fullText);
          const filteredModules = parsed.modules.filter(
            (module) => module.type !== 'dice' && module.type !== 'suggestions',
          );
          // 将工具调用的骰子结果作为 dice module 插入
          const diceModules = diceResults.length > 0
            ? [{ type: 'dice' as const, content: diceResults.join('\n') }]
            : [];
          const mergedModules = [...diceModules, ...filteredModules];
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
                provider: 'openai',
                model: settings?.fastModel || 'gpt-5-mini',
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
          console.error('[api/chat] Agent 运行失败', error);
          // 保留已生成的片段，避免用户回滚时丢失叙事
          if (fullText.trim()) {
            try {
              const parsed = parseChatModules(fullText);
              const filteredModules = parsed.modules.filter(
                (module) => module.type !== 'dice' && module.type !== 'suggestions',
              );
              const diceModules = diceResults.length > 0
                ? [{ type: 'dice' as const, content: diceResults.join('\n') }]
                : [];
              const mergedModules = [...diceModules, ...filteredModules];
              const assistantContent = buildMessageContentFromModules(mergedModules, fullText);
              await createGameMessage(db, {
                gameId: game.id,
                role: 'dm',
                speaker: '肉团长',
                content: assistantContent,
                modules: mergedModules,
              });
            } catch (persistError) {
              console.warn('[api/chat] 部分叙事保存失败', persistError);
            }
          }
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
