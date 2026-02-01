'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';

type ScriptBackgroundSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptBackgroundSection({ draft, mutateDraft }: ScriptBackgroundSectionProps) {
  function handleBackgroundChange(field: keyof ScriptDraft['background'], value: string) {
    mutateDraft((next) => {
      next.background[field] = value;
    });
  }

  return (
    <Section id="script-section-background" title="背景设定" description="玩家逐步探索的信息应来自这里。">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs text-[var(--ink-soft)]">概要</Label>
          <Textarea
            rows={3}
            value={draft.background.overview}
            onChange={(event) => handleBackgroundChange('overview', event.target.value)}
          />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs text-[var(--ink-soft)]">真相</Label>
          <Textarea
            rows={3}
            value={draft.background.truth}
            onChange={(event) => handleBackgroundChange('truth', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">主题（每行一条）</Label>
          <Textarea
            rows={3}
            value={draft.background.themesText}
            onChange={(event) => handleBackgroundChange('themesText', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">势力（每行一条）</Label>
          <Textarea
            rows={3}
            value={draft.background.factionsText}
            onChange={(event) => handleBackgroundChange('factionsText', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">地点（每行一条）</Label>
          <Textarea
            rows={3}
            value={draft.background.locationsText}
            onChange={(event) => handleBackgroundChange('locationsText', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">秘密（每行一条）</Label>
          <Textarea
            rows={3}
            value={draft.background.secretsText}
            onChange={(event) => handleBackgroundChange('secretsText', event.target.value)}
          />
        </div>
      </div>
    </Section>
  );
}
