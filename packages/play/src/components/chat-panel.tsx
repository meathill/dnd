'use client';

import { useState } from 'react';
import type { GameMessageRecord } from '@/lib/play/types';
import { Button } from './button';
import { Textarea } from './textarea';

type ChatPanelProps = {
  gameId: string;
  initialMessages: GameMessageRecord[];
  initialBalance: number;
};

type SendMessageResponse = {
  userMessage: GameMessageRecord;
  assistantMessage: GameMessageRecord;
  balance: number;
};

export function ChatPanel({ gameId, initialMessages, initialBalance }: ChatPanelProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [balance, setBalance] = useState(initialBalance);
  const [input, setInput] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) {
      return;
    }
    setIsPending(true);
    setErrorMessage('');
    try {
      const response = await fetch(`/api/games/${gameId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: input.trim() }),
      });
      const payload = (await response.json()) as Partial<SendMessageResponse> & { error?: string };
      if (!response.ok || !payload.userMessage || !payload.assistantMessage || typeof payload.balance !== 'number') {
        throw new Error(payload.error || '发送失败');
      }
      setMessages((current) => [...current, payload.userMessage!, payload.assistantMessage!]);
      setBalance(payload.balance);
      setInput('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '发送失败');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
        <span>当前余额</span>
        <span className="font-medium text-zinc-50">{balance}</span>
      </div>
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            className={message.role === 'assistant' ? 'rounded-2xl bg-zinc-100 p-4 text-zinc-950' : 'rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-50'}
            key={message.id}
          >
            <p className="mb-2 text-xs uppercase tracking-[0.18em] opacity-70">{message.role === 'assistant' ? '肉团长' : '玩家'}</p>
            <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
          </div>
        ))}
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <Textarea onChange={(event) => setInput(event.target.value)} placeholder="输入你的行动或发言" value={input} />
        {errorMessage ? <p className="text-sm text-red-400">{errorMessage}</p> : null}
        <Button disabled={isPending || !input.trim()} type="submit">
          {isPending ? '发送中...' : '发送'}
        </Button>
      </form>
    </div>
  );
}
