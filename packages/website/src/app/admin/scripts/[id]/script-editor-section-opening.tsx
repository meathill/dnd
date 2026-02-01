'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { createOpeningMessageDraft } from './script-editor-mappers';

type ScriptOpeningSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptOpeningSection({ draft, mutateDraft }: ScriptOpeningSectionProps) {
  function handleOpeningMessageChange(
    index: number,
    field: keyof ScriptDraft['openingMessages'][number],
    value: string,
  ) {
    mutateDraft((next) => {
      next.openingMessages[index][field] = value;
    });
  }

  function handleAddOpeningMessage() {
    mutateDraft((next) => {
      next.openingMessages.push(createOpeningMessageDraft());
    });
  }

  function handleRemoveOpeningMessage(index: number) {
    mutateDraft((next) => {
      next.openingMessages.splice(index, 1);
    });
  }

  return (
    <Section title="开场对白" description="按顺序写入开场对白。">
      {draft.openingMessages.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">暂无开场对白。</p>
      ) : (
        <div className="space-y-3">
          {draft.openingMessages.map((message, index) => (
            <div
              className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs"
              key={`${message.role}-${index}`}
            >
              <div className="grid gap-3 lg:grid-cols-[8rem_1fr_6rem]">
                <div className="space-y-1">
                  <Label className="text-[10px] text-[var(--ink-soft)]">角色</Label>
                  <Select
                    value={message.role}
                    onValueChange={(value) => handleOpeningMessageChange(index, 'role', value)}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dm">DM</SelectItem>
                      <SelectItem value="system">系统</SelectItem>
                      <SelectItem value="player">玩家</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-[var(--ink-soft)]">说话者（可选）</Label>
                  <Input
                    size="sm"
                    value={message.speaker ?? ''}
                    onChange={(event) => handleOpeningMessageChange(index, 'speaker', event.target.value)}
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button onClick={() => handleRemoveOpeningMessage(index)} size="xs" variant="destructive-outline">
                    删除
                  </Button>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <Label className="text-[10px] text-[var(--ink-soft)]">内容</Label>
                <Textarea
                  rows={3}
                  value={message.content}
                  onChange={(event) => handleOpeningMessageChange(index, 'content', event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleAddOpeningMessage} size="sm" variant="outline">
        添加对白
      </Button>
    </Section>
  );
}
