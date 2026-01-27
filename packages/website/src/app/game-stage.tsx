'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import CharacterCardPanel from './character-card-panel';
import SceneMapPanel from './scene-map-panel';
import { chatMessages, quickActions } from './home-data';
import { useGameStore } from '../lib/game/game-store';
import type { ChatMessage, ChatModule, ChatRole, ScriptDefinition, ScriptOpeningMessage } from '../lib/game/types';

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
  | { type: 'error'; error: string };

function consumeSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const chunks = buffer.split('\n\n');
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
              ? '绘图提示'
              : module.type === 'notice'
                ? '提示'
                : '叙事';
        return (
          <div className="rounded-lg border border-[rgba(27,20,12,0.12)] bg-white/70 px-3 py-2" key={`m-${index}`}>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">{label}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-[var(--ink-strong)]">{module.content}</p>
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
  const messageListRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
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
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setMessages(baseMessages);
    setInputText('');
    setSendError('');
    shouldAutoScrollRef.current = true;
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
        setMessages((current) => [...current, assistantMessage]);
        return;
      }

      const streamId = `dm-stream-${Date.now()}`;
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
            setMessages((current) =>
              current.map((message) =>
                message.id === streamId ? { ...message, content: `${message.content}${event.text}` } : message,
              ),
            );
          } else if (event.type === 'done') {
            setMessages((current) =>
              current.map((message) => (message.id === streamId ? { ...event.message, isStreaming: false } : message)),
            );
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 请求失败';
      setSendError(message);
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid h-full gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_20rem] overflow-hidden">
      <main
        className="panel-card animate-[fade-up_0.8s_ease-out_both] flex h-full flex-col rounded-xl p-4"
        style={{ animationDelay: '0.1s' }}
      >
        <SceneMapPanel />
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
                <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm text-[var(--ink-strong)] ${styles.bubble}`}>
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
              <button
                className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)] transition hover:-translate-y-0.5 hover:border-[var(--accent-brass)]"
                key={action}
                onClick={() => handleQuickAction(action)}
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.6)] p-4">
            <textarea
              className="min-h-[80px] w-full resize-none bg-transparent text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:outline-none"
              placeholder="描述你要说的话或采取的行动，肉团长会结合规则做出回应。"
              rows={3}
              disabled={isSending}
              value={inputText}
              onChange={handleInputChange}
            ></textarea>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={`text-xs ${sendError ? 'text-[var(--accent-ember)]' : 'text-[var(--ink-soft)]'}`}>
                {sendError || '提示：区分“说的话”和“动作”，让叙事更清晰。'}
              </p>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-1.5 text-xs text-[var(--ink-muted)]"
                  disabled={isSending}
                  type="button"
                >
                  记录回合
                </button>
                <button
                  className="rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white disabled:opacity-70"
                  disabled={isSending || !inputText.trim()}
                  onClick={handleSendMessage}
                  type="button"
                >
                  {isSending ? '指令发送中...' : '发送指令'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <aside className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
        <CharacterCardPanel skillOptions={script?.skillOptions} rules={script?.rules} />
      </aside>
    </div>
  );
}
