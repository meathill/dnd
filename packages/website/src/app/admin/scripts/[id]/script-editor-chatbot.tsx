'use client';

import { useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScriptDraft } from './script-editor-types';
import {
  describeScriptPatch,
  type BackgroundPatch,
  type BasicPatch,
  type NpcPatchInput,
  type OptionsPatch,
  type ScenePatchInput,
  type ScriptPatch,
} from './script-editor-patches';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  streaming?: boolean;
};

type PendingPatch = {
  callId: string;
  patch: ScriptPatch;
  status: 'pending' | 'applied' | 'dismissed';
};

type StreamEvent =
  | { type: 'status'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'tool_call'; callId: string; name: string; arguments: string }
  | { type: 'tool_result'; callId: string; result: string }
  | { type: 'done'; text: string }
  | { type: 'error'; error: string };

type ScriptEditorChatbotProps = {
  scriptId: string;
  draft: ScriptDraft;
  onApplyPatch: (patch: ScriptPatch) => void;
};

function consumeSseBuffer(buffer: string): { events: StreamEvent[]; rest: string } {
  const normalized = buffer.replace(/\r/g, '');
  const chunks = normalized.split('\n\n');
  const rest = chunks.pop() ?? '';
  const events: StreamEvent[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split('\n').filter((line) => line.startsWith('data:'));
    if (lines.length === 0) continue;
    const dataText = lines.map((line) => line.replace(/^data:\s*/, '')).join('');
    try {
      events.push(JSON.parse(dataText) as StreamEvent);
    } catch {
      // ignore malformed payload
    }
  }
  return { events, rest };
}

function toolCallToPatch(name: string, rawArgs: string): ScriptPatch | null {
  let args: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(rawArgs);
    if (parsed && typeof parsed === 'object') {
      args = parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  switch (name) {
    case 'patch_basic':
      return { kind: 'basic', patch: args as BasicPatch };
    case 'patch_background':
      return { kind: 'background', patch: args as BackgroundPatch };
    case 'patch_npc':
      return { kind: 'npc', patch: args as NpcPatchInput };
    case 'remove_npc': {
      const id = typeof args.id === 'string' ? args.id : '';
      return id ? { kind: 'npc_remove', id } : null;
    }
    case 'patch_scene':
      return { kind: 'scene', patch: args as ScenePatchInput };
    case 'remove_scene': {
      const id = typeof args.id === 'string' ? args.id : '';
      return id ? { kind: 'scene_remove', id } : null;
    }
    case 'patch_options':
      return { kind: 'options', patch: args as OptionsPatch };
    default:
      return null;
  }
}

function renderPatchPreview(patch: ScriptPatch): string {
  if (patch.kind === 'npc_remove' || patch.kind === 'scene_remove') {
    return `id: ${patch.id}`;
  }
  // For readable preview: pretty-print minus undefined entries
  if ('patch' in patch) {
    const entries = Object.entries(patch.patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return '（空）';
    return entries
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `• ${key}:\n  - ${value.join('\n  - ')}`;
        }
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        return `• ${key}: ${str}`;
      })
      .join('\n');
  }
  return JSON.stringify(patch, null, 2);
}

export default function ScriptEditorChatbot({ scriptId, onApplyPatch }: ScriptEditorChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingPatches, setPendingPatches] = useState<Record<string, PendingPatch>>({});
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorText, setErrorText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  function handleInputChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setInputText(event.target.value);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  function handleApplyPatch(callId: string) {
    const pending = pendingPatches[callId];
    if (!pending || pending.status !== 'pending') return;
    onApplyPatch(pending.patch);
    setPendingPatches((current) => ({
      ...current,
      [callId]: { ...pending, status: 'applied' },
    }));
  }

  function handleDismissPatch(callId: string) {
    setPendingPatches((current) => {
      const existing = current[callId];
      if (!existing) return current;
      return { ...current, [callId]: { ...existing, status: 'dismissed' } };
    });
  }

  async function handleSend() {
    if (isSending) return;
    const content = inputText.trim();
    if (!content) return;
    setErrorText('');
    setStatusText('');

    const userMessage: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content,
    };
    const assistantId = `a-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      streaming: true,
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setInputText('');
    setIsSending(true);

    try {
      const history = messages.map((message) => ({ role: message.role, content: message.content }));
      const response = await fetch('/api/admin/scripts/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptId,
          input: content,
          history: [...history, { role: 'user', content }],
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'AI 请求失败');
      }
      if (!response.body) {
        throw new Error('响应没有内容');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { events, rest } = consumeSseBuffer(buffer);
        buffer = rest;
        for (const event of events) {
          if (event.type === 'status') {
            setStatusText(event.text);
          } else if (event.type === 'delta') {
            setStatusText('');
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? { ...message, content: `${message.content}${event.text}` }
                  : message,
              ),
            );
          } else if (event.type === 'tool_call') {
            const patch = toolCallToPatch(event.name, event.arguments);
            if (patch) {
              setPendingPatches((current) => ({
                ...current,
                [event.callId]: { callId: event.callId, patch, status: 'pending' },
              }));
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? {
                        ...message,
                        content: `${message.content}\n\n【建议修改】${describeScriptPatch(patch)}（点击下方卡片应用）\n`,
                      }
                    : message,
                ),
              );
            }
          } else if (event.type === 'tool_result') {
            // no-op: tool result is already echoed via tool_call card
          } else if (event.type === 'done') {
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId ? { ...message, streaming: false } : message,
              ),
            );
            setStatusText('');
          } else if (event.type === 'error') {
            throw new Error(event.error);
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI 请求失败';
      setErrorText(message);
      setMessages((current) =>
        current.map((item) => (item.id === assistantId ? { ...item, streaming: false } : item)),
      );
    } finally {
      setIsSending(false);
      setStatusText('');
    }
  }

  if (isCollapsed) {
    return (
      <aside className="panel-card flex flex-col items-center gap-3 p-3">
        <Button onClick={() => setIsCollapsed(false)} size="sm" variant="outline">
          展开助手
        </Button>
      </aside>
    );
  }

  const pendingList = Object.values(pendingPatches);

  return (
    <aside className="panel-card flex flex-col gap-3 p-3 sm:p-4 lg:h-full lg:max-h-dvh lg:overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">AI 助手</p>
          <h3 className="text-base font-semibold text-[var(--ink-strong)]">剧本编辑助手</h3>
        </div>
        <Button onClick={() => setIsCollapsed(true)} size="xs" variant="outline">
          收起
        </Button>
      </div>
      <p className="text-xs text-[var(--ink-muted)]">
        描述你想要的调整，助手会给出修改建议，点「应用」后会写入草稿（仍需手动点保存修改）。
      </p>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/60 p-2">
        {messages.length === 0 ? (
          <p className="text-xs text-[var(--ink-soft)]">
            试试：「帮我把简介改得更凝练」「新增一个中立 NPC 图书馆员」「把隐藏要点拆成三条」。
          </p>
        ) : null}
        {messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              className={cn('flex flex-col gap-1', isUser ? 'items-end' : 'items-start')}
              key={message.id}
            >
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">
                {isUser ? '我' : '助手'}
              </span>
              <div
                className={cn(
                  'max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed text-[var(--ink-strong)]',
                  isUser ? 'bg-[rgba(255,255,255,0.85)]' : 'bg-[rgba(241,230,214,0.85)]',
                )}
              >
                {message.content || (message.streaming ? '...' : '')}
                {message.streaming ? <span className="ml-1 animate-pulse">▍</span> : null}
              </div>
            </div>
          );
        })}
      </div>

      {pendingList.length > 0 ? (
        <div className="flex max-h-60 flex-col gap-2 overflow-y-auto rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-soft)]">修改建议</p>
          {pendingList.map((item) => (
            <div
              className="rounded-lg border border-[rgba(27,20,12,0.1)] bg-white/80 px-2 py-2 text-xs"
              key={item.callId}
            >
              <p className="font-medium text-[var(--ink-strong)]">{describeScriptPatch(item.patch)}</p>
              <pre className="mt-1 whitespace-pre-wrap text-[11px] text-[var(--ink-muted)]">
                {renderPatchPreview(item.patch)}
              </pre>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-[10px]',
                    item.status === 'applied'
                      ? 'text-[var(--accent-moss)]'
                      : item.status === 'dismissed'
                        ? 'text-[var(--ink-soft)]'
                        : 'text-[var(--accent-brass)]',
                  )}
                >
                  {item.status === 'applied' ? '已应用' : item.status === 'dismissed' ? '已忽略' : '待处理'}
                </span>
                {item.status === 'pending' ? (
                  <div className="flex gap-1">
                    <Button onClick={() => handleDismissPatch(item.callId)} size="xs" variant="outline">
                      忽略
                    </Button>
                    <Button onClick={() => handleApplyPatch(item.callId)} size="xs">
                      应用
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {errorText ? <p className="text-xs text-[var(--accent-ember)]">{errorText}</p> : null}
        {statusText && !errorText ? (
          <p className="text-xs text-[var(--accent-river)]">{statusText}</p>
        ) : null}
        <textarea
          className="min-h-[64px] w-full resize-none rounded-lg border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.75)] p-2 text-xs text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:outline-none"
          disabled={isSending}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          placeholder="告诉助手你想怎么改（Enter 发送，Shift+Enter 换行）"
          rows={3}
          value={inputText}
        />
        <div className="flex justify-end">
          <Button disabled={isSending || !inputText.trim()} onClick={handleSend} size="sm">
            {isSending ? '发送中...' : '发送'}
          </Button>
        </div>
      </div>
    </aside>
  );
}
