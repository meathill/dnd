'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';

type ScriptBasicSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptBasicSection({ draft, mutateDraft }: ScriptBasicSectionProps) {
  function handleBaseChange(field: 'title' | 'summary' | 'setting' | 'difficulty', value: string) {
    mutateDraft((next) => {
      next[field] = value;
    });
  }

  return (
    <Section title="基础信息" description="标题、时代背景与难度是必填项。">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">剧本编号</Label>
          <Input value={draft.id} disabled />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">标题</Label>
          <Input value={draft.title} onChange={(event) => handleBaseChange('title', event.target.value)} />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs text-[var(--ink-soft)]">简介</Label>
          <Textarea
            rows={3}
            value={draft.summary}
            onChange={(event) => handleBaseChange('summary', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">时代背景</Label>
          <Input value={draft.setting} onChange={(event) => handleBaseChange('setting', event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">难度</Label>
          <Input value={draft.difficulty} onChange={(event) => handleBaseChange('difficulty', event.target.value)} />
        </div>
      </div>
    </Section>
  );
}
