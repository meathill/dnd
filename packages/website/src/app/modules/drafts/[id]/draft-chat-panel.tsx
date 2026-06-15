'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import type { ModuleDraftMessageRecord } from '@/lib/game/types';

type Props = {
  draftId: string;
  initialMessages: ModuleDraftMessageRecord[];
};

type StreamingState = {
  text: string;
  tools: Array<{ name: string; status: 'running' | 'completed' }>;
};

const EMPTY_STREAMING: StreamingState = { text: '', tools: [] };

type AgentEventPayload =
  | { event: 'user'; userMessage: ModuleDraftMessageRecord }
  | { event: 'text-delta'; delta: string }
  | { event: 'tool-call'; name: string }
  | { event: 'tool-completed'; name: string }
  | { event: 'done'; userMessage: ModuleDraftMessageRecord; assistantMessage: ModuleDraftMessageRecord }
  | { event: 'error'; message: string };

export function DraftChatPanel({ draftId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [streaming, setStreaming] = useState<StreamingState>(EMPTY_STREAMING);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content) return;
    setIsPending(true);
    setError(null);
    setStreaming(EMPTY_STREAMING);
    try {
      const response = await fetch(`/api/module-drafts/${draftId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? `发送失败 (${response.status})`);
      }
      await consumeStream(response.body, (evt) => {
        switch (evt.event) {
          case 'user':
            setMessages((current) => [...current, evt.userMessage]);
            setInput('');
            break;
          case 'text-delta':
            setStreaming((current) => ({ ...current, text: current.text + evt.delta }));
            break;
          case 'tool-call':
            setStreaming((current) => ({
              ...current,
              tools: [...current.tools, { name: evt.name, status: 'running' }],
            }));
            break;
          case 'tool-completed':
            setStreaming((current) => ({
              ...current,
              tools: current.tools.map((tool) =>
                tool.name === evt.name && tool.status === 'running' ? { ...tool, status: 'completed' } : tool,
              ),
            }));
            break;
          case 'done':
            // 流结束后，覆盖 user 占位 + 追加最终 assistant；不依赖前面 user 事件的 id
            setMessages((current) => {
              const withoutLastUser =
                current.length > 0 && current[current.length - 1].id === evt.userMessage.id
                  ? current.slice(0, -1)
                  : current;
              return [...withoutLastUser, evt.userMessage, evt.assistantMessage];
            });
            setStreaming(EMPTY_STREAMING);
            break;
          case 'error':
            setError(evt.message);
            break;
        }
      });
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '发送失败');
    } finally {
      setIsPending(false);
    }
  }

  const showStreamingBubble = isPending && (streaming.text.length > 0 || streaming.tools.length > 0);

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {messages.length === 0 && !showStreamingBubble ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
            发送第一条消息开始对话。建议告诉助手要做什么题材的模组。
          </p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        {showStreamingBubble ? <StreamingBubble streaming={streaming} /> : null}
        {isPending && !showStreamingBubble ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">已发送，正在等待助手响应…</p>
        ) : null}
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Textarea
          onChange={(event) => setInput(event.target.value)}
          placeholder="请告诉助手要修改哪一部分（标题、背景、NPC、场景等）"
          value={input}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button disabled={isPending || !input.trim()} type="submit">
          {isPending ? '正在生成…' : '发送'}
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ModuleDraftMessageRecord }) {
  const isAssistant = message.role === 'assistant';
  return (
    <div
      className={
        isAssistant
          ? 'rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm'
          : 'rounded-2xl bg-zinc-100 p-4 text-zinc-900'
      }
    >
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{isAssistant ? '助手' : 'editor'}</p>
      <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
    </div>
  );
}

function StreamingBubble({ streaming }: { streaming: StreamingState }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">助手 · 生成中</p>
      {streaming.tools.length > 0 ? (
        <ul className="mb-3 space-y-1 text-xs text-zinc-500">
          {streaming.tools.map((tool, index) => (
            <li key={`${tool.name}-${index}`}>
              {tool.status === 'completed' ? '✓' : '⋯'} {tool.name}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="whitespace-pre-wrap text-sm leading-7">
        {streaming.text}
        <span className="ml-1 inline-block h-3 w-2 animate-pulse bg-zinc-300 align-middle" />
      </p>
    </div>
  );
}

async function consumeStream(body: ReadableStream<Uint8Array>, onEvent: (event: AgentEventPayload) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const sep = buffer.indexOf('\n\n');
      if (sep < 0) break;
      const block = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseSseBlock(block);
      if (!parsed) continue;
      onEvent({ event: parsed.event, ...JSON.parse(parsed.data) } as AgentEventPayload);
    }
  }
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  let event = 'message';
  const dataParts: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice('event:'.length).trim();
    else if (line.startsWith('data:')) dataParts.push(line.slice('data:'.length).trim());
  }
  if (dataParts.length === 0) return null;
  return { event, data: dataParts.join('\n') };
}
