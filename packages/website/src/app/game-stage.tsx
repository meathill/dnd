'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import CharacterCardPanel from './character-card-panel';
import DmMemoryPanel from './dm-memory-panel';
import SceneMapPanel from './scene-map-panel';
import { chatMessages, quickActions } from './home-data';
import { useGameStore } from '../lib/game/game-store';
import type {
  ChatMessage,
  ChatModule,
  ChatRole,
  CharacterRecord,
  GameMemorySnapshot,
  ScriptDefinition,
  ScriptOpeningMessage,
} from '../lib/game/types';
import { Button } from '../components/ui/button';

const messageToneStyles = {
  dm: {
    bubble: 'bg-[rgba(241,230,214,0.85)]',
    badge: 'bg-[var(--accent-moss)]',
  },
  player: {
    bubble: 'bg-[rgba(255,255,255,0.82)]',
    badge: 'bg-[var(--accent-brass)]',
  },
  system: {
    bubble: 'bg-[rgba(46,108,106,0.14)]',
    badge: 'bg-[var(--accent-river)]',
  },
} satisfies Record<ChatRole, { bubble: string; badge: string }>;

const defaultSpeakerMap: Record<ChatRole, string> = {
  dm: '肉团长',
  player: '玩家',
  system: '系统',
};

function buildOpeningChatMessages(messages: ScriptOpeningMessage[]): ChatMessage[] {
  return messages.map((message, index) => ({
    id: `opening-${index}`,
    role: message.role,
    speaker: message.speaker ?? defaultSpeakerMap[message.role],
    time: '开场',
    content: message.content,
  }));
}

function formatTimeValue(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; message: ChatMessage }
  | { type: 'error'; error: string }
  | { type: 'status'; text: string };

function consumeSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const normalized = buffer.replace(/\r/g, '');
  const chunks = normalized.split('\n\n');
  const rest = chunks.pop() ?? '';
  const events: StreamEvent[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split('\n').filter((line) => line.startsWith('data:'));
    if (lines.length === 0) {
      continue;
    }
    const dataText = lines.map((line) => line.replace(/^data:\s*/, '')).join('');
    try {
      const payload = JSON.parse(dataText) as StreamEvent;
      events.push(payload);
    } catch {
      // ignore malformed payload
    }
  }
  return { events, rest };
}

function renderModules(modules: ChatModule[]) {
  return (
    <div className="space-y-2">
      {modules.map((module, index) => {
        if (module.type === 'suggestions') {
          return null;
        }
        const label =
          module.type === 'dice'
            ? '掷骰结果'
            : module.type === 'map'
              ? '环境地图'
              : module.type === 'notice'
                ? '提示'
                : '叙事';
        return (
          <div className="rounded-lg border border-[rgba(27,20,12,0.12)] bg-white/70 px-3 py-2" key={`m-${index}`}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</p>
            {module.type === 'map' ? (
              <pre className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--ink-strong)]">
                {module.content}
              </pre>
            ) : (
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--ink-strong)]">{module.content}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

type GameStageProps = {
  script?: ScriptDefinition | null;
  initialMessages?: ChatMessage[];
};

export default function GameStage({ script = null, initialMessages = [] }: GameStageProps) {
  const character = useGameStore((state) => state.character);
  const gameId = useGameStore((state) => state.activeGameId);
  const setCharacter = useGameStore((state) => state.setCharacter);
  const setMemory = useGameStore((state) => state.setMemory);
  const setMapText = useGameStore((state) => state.setMapText);
  const messageListRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const statusMessageIdRef = useRef<string | null>(null);
  const statusStepsRef = useRef<string[]>([]);
  const streamMessageIdRef = useRef<string | null>(null);
  const hasDmOutputStartedRef = useRef(false);
  const memorySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openingMessages = useMemo(() => {
    return script?.openingMessages?.length ? buildOpeningChatMessages(script.openingMessages) : null;
  }, [script]);
  const baseMessages = useMemo(
    () =>
      initialMessages.length > 0
        ? initialMessages
        : openingMessages && openingMessages.length > 0
          ? openingMessages
          : chatMessages,
    [openingMessages, initialMessages],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(baseMessages);
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusSteps, setStatusSteps] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  function extractMapText(sourceMessages: ChatMessage[]): string | null {
    for (let index = sourceMessages.length - 1; index >= 0; index -= 1) {
      const message = sourceMessages[index];
      if (message.role !== 'dm') {
        continue;
      }
      if (!message.modules) {
        continue;
      }
      const mapModule = message.modules.find((module) => module.type === 'map');
      if (mapModule && mapModule.content?.trim()) {
        return mapModule.content.trim();
      }
    }
    return null;
  }

  function syncMapFromMessages(sourceMessages: ChatMessage[]) {
    const nextMap = extractMapText(sourceMessages);
    setMapText(nextMap);
  }

  async function syncMemorySilently() {
    if (!gameId) {
      return;
    }
    try {
      const response = await fetch(`/api/games/${gameId}/memory`, { cache: 'no-store' });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as {
        memory?: GameMemorySnapshot | null;
        character?: CharacterRecord;
      };
      if (data.character) {
        setCharacter(data.character);
      }
      if (data.memory) {
        setMemory(data.memory);
        setMapText(data.memory.mapText || null);
      }
    } catch {
      // ignore silent sync errors
    }
  }

  function scheduleMemorySync(delay = 600) {
    if (memorySyncTimerRef.current) {
      clearTimeout(memorySyncTimerRef.current);
    }
    memorySyncTimerRef.current = setTimeout(() => {
      void syncMemorySilently();
    }, delay);
  }

  useEffect(() => {
    setMessages(baseMessages);
    setInputText('');
    setSendError('');
    setStatusMessage('');
    setStatusSteps([]);
    statusStepsRef.current = [];
    statusMessageIdRef.current = null;
    streamMessageIdRef.current = null;
    hasDmOutputStartedRef.current = false;
    shouldAutoScrollRef.current = true;
    syncMapFromMessages(baseMessages);
  }, [baseMessages]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }
    if (!shouldAutoScrollRef.current) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInputText(event.target.value);
  }

  function handleQuickAction(action: string) {
    setInputText(action);
  }

  function clearStatusIndicators() {
    setStatusMessage('');
    setStatusSteps([]);
    statusStepsRef.current = [];
    const statusId = statusMessageIdRef.current;
    statusMessageIdRef.current = null;
    if (statusId) {
      setMessages((current) => current.filter((message) => message.id !== statusId));
    }
  }

  function markDmOutputStarted() {
    if (hasDmOutputStartedRef.current) {
      return;
    }
    hasDmOutputStartedRef.current = true;
    clearStatusIndicators();
  }

  function updateStatusIndicators(text: string) {
    if (hasDmOutputStartedRef.current) {
      return;
    }
    const nextSteps = statusStepsRef.current.includes(text)
      ? statusStepsRef.current
      : [...statusStepsRef.current, text];
    statusStepsRef.current = nextSteps;
    setStatusMessage(text);
    setStatusSteps(nextSteps);
    const statusId = statusMessageIdRef.current ?? `status-${Date.now()}`;
    statusMessageIdRef.current = statusId;
    const statusContent = `执行状态：${nextSteps.join(' → ')}`;
    setMessages((current) => {
      const index = current.findIndex((message) => message.id === statusId);
      if (index >= 0) {
        const previous = current[index];
        const next = [...current];
        next[index] = {
          ...previous,
          role: 'system',
          speaker: defaultSpeakerMap.system,
          content: statusContent,
        };
        return next;
      }
      const statusMessage: ChatMessage = {
        id: statusId,
        role: 'system',
        speaker: defaultSpeakerMap.system,
        time: formatTimeValue(new Date()),
        content: statusContent,
      };
      const streamId = streamMessageIdRef.current;
      if (streamId) {
        const streamIndex = current.findIndex((message) => message.id === streamId);
        if (streamIndex >= 0) {
          const next = [...current];
          next.splice(streamIndex, 0, statusMessage);
          return next;
        }
      }
      return [...current, statusMessage];
    });
  }

  function handleMessageScroll() {
    const container = messageListRef.current;
    if (!container) {
      return;
    }
    const threshold = 80;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distance <= threshold;
  }

  async function handleSendMessage() {
    if (isSending) {
      return;
    }
    if (!gameId) {
      setSendError('缺少游戏编号，无法发送指令。');
      return;
    }
    const content = inputText.trim();
    if (!content) {
      return;
    }
    setSendError('');
    clearStatusIndicators();
    hasDmOutputStartedRef.current = false;

    const speakerName = character?.name ? `玩家 · ${character.name}` : '玩家';
    const now = new Date();
    const userMessage: ChatMessage = {
      id: `player-${now.getTime()}`,
      role: 'player',
      speaker: speakerName,
      time: formatTimeValue(now),
      content,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputText('');
    setIsSending(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId,
          input: content,
          history: nextMessages.slice(-40).map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? 'AI 请求失败');
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream') || !response.body) {
        const data = (await response.json()) as { text?: string; error?: string };
        if (!data.text) {
          throw new Error(data.error ?? 'AI 没有返回内容');
        }
        const replyTime = new Date();
        const assistantMessage: ChatMessage = {
          id: `dm-${replyTime.getTime()}`,
          role: 'dm',
          speaker: defaultSpeakerMap.dm,
          time: formatTimeValue(replyTime),
          content: data.text,
        };
        markDmOutputStarted();
        setMessages((current) => [...current, assistantMessage]);
        scheduleMemorySync();
        return;
      }

      const streamId = `dm-stream-${Date.now()}`;
      streamMessageIdRef.current = streamId;
      const streamMessage: ChatMessage = {
        id: streamId,
        role: 'dm',
        speaker: defaultSpeakerMap.dm,
        time: formatTimeValue(new Date()),
        content: '',
        isStreaming: true,
      };
      setMessages((current) => [...current, streamMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = consumeSseBuffer(buffer);
        buffer = rest;
        for (const event of events) {
          if (event.type === 'delta') {
            markDmOutputStarted();
            setMessages((current) =>
              current.map((message) =>
                message.id === streamId ? { ...message, content: `${message.content}${event.text}` } : message,
              ),
            );
          } else if (event.type === 'done') {
            markDmOutputStarted();
            setMessages((current) => {
              streamMessageIdRef.current = null;
              const nextMessages = current.map((message) =>
                message.id === streamId ? { ...event.message, isStreaming: false } : message,
              );
              syncMapFromMessages(nextMessages);
              return nextMessages;
            });
            scheduleMemorySync();
          } else if (event.type === 'status') {
            updateStatusIndicators(event.text);
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 请求失败';
      setSendError(message);
      setInputText(content);
      clearStatusIndicators();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden">
      <main
        className="panel-card animate-[fade-up_0.8s_ease-out_both] flex flex-col p-3 sm:p-4 lg:h-dvh border-r"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="grid grid-cols-[1fr_20rem] gap-4 mb-4">
          <SceneMapPanel script={script} />
          <DmMemoryPanel />
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-4 input-area"
          ref={messageListRef}
          onScroll={handleMessageScroll}
        >
          {messages.map((message) => {
            const styles = messageToneStyles[message.role];
            const align = message.role === 'player' ? 'items-end' : 'items-start';
            return (
              <div className={`flex flex-col gap-2 ${align}`} key={message.id}>
                <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] text-white ${styles.badge}`}>
                    {message.speaker}
                  </span>
                  <span className="text-[var(--ink-soft)]">{message.time}</span>
                </div>
                <div
                  className={`max-w-full rounded-xl px-4 py-3 text-sm text-[var(--ink-strong)] sm:max-w-[85%] ${styles.bubble}`}
                >
                  {message.modules && message.modules.length > 0 ? (
                    renderModules(message.modules)
                  ) : (
                    <p className="whitespace-pre-line leading-relaxed">
                      {message.content}
                      {message.isStreaming ? <span className="ml-1 animate-pulse">▍</span> : null}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[rgba(27,20,12,0.08)] pt-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button key={action} onClick={() => handleQuickAction(action)} size="xs" variant="outline">
                {action}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.6)] p-3 sm:p-4">
            <textarea
              className="min-h-[80px] w-full resize-none bg-transparent text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:outline-none"
              placeholder="描述你要说的话或采取的行动，肉团长会结合规则做出回应。"
              rows={3}
              disabled={isSending}
              value={inputText}
              onChange={handleInputChange}
            ></textarea>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className={`text-xs ${
                  sendError
                    ? 'text-[var(--accent-ember)]'
                    : statusMessage
                      ? 'text-[var(--accent-river)]'
                      : 'text-[var(--ink-soft)]'
                }`}
              >
                {sendError || statusMessage || '提示：区分“说的话”和“动作”，让叙事更清晰。'}
              </p>
              <div className="flex gap-2">
                <Button disabled={isSending || !inputText.trim()} onClick={handleSendMessage} size="sm">
                  {isSending ? '指令发送中...' : '发送指令'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CharacterCardPanel skillOptions={script?.skillOptions} rules={script?.rules} />
    </div>
  );
}
