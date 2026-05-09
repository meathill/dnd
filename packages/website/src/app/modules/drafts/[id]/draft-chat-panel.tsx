'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Textarea } from '@/components/textarea';
import type { ModuleDraftMessageRecord } from '@/lib/game/types';

type Props = {
  draftId: string;
  initialMessages: ModuleDraftMessageRecord[];
};

type SendResponse = {
  userMessage?: ModuleDraftMessageRecord;
  assistantMessage?: ModuleDraftMessageRecord;
  error?: string;
};

export function DraftChatPanel({ draftId, initialMessages }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content) {
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/module-drafts/${draftId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json().catch(() => null)) as SendResponse | null;
      const userMessage = payload?.userMessage;
      const assistantMessage = payload?.assistantMessage;
      if (!response.ok || !userMessage || !assistantMessage) {
        throw new Error(payload?.error ?? '发送失败');
      }
      setMessages((current) => [...current, userMessage, assistantMessage]);
      setInput('');
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '发送失败');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {messages.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
            发送第一条消息开始对话。建议告诉助手要做什么题材的模组。
          </p>
        ) : (
          messages.map((message) => (
            <div
              className={
                message.role === 'assistant'
                  ? 'rounded-2xl bg-zinc-950 p-4 text-white'
                  : 'rounded-2xl bg-zinc-100 p-4 text-zinc-950'
              }
              key={message.id}
            >
              <p className="mb-2 text-xs uppercase tracking-[0.18em] opacity-70">
                {message.role === 'assistant' ? '助手' : 'editor'}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
            </div>
          ))
        )}
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Textarea
          onChange={(event) => setInput(event.target.value)}
          placeholder="请告诉助手要修改哪一部分（标题、背景、NPC、场景等）"
          value={input}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button disabled={isPending || !input.trim()} type="submit">
          {isPending ? '发送中…' : '发送'}
        </Button>
      </form>
    </div>
  );
}
