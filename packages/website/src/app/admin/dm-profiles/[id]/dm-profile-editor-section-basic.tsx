'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { DmProfileDetail } from '@/lib/game/types';
import { Section } from './dm-profile-editor-section';
import type { DraftMutator } from './dm-profile-editor-form';

type DmProfileBasicSectionProps = {
  draft: DmProfileDetail;
  mutateDraft: DraftMutator;
};

export default function DmProfileBasicSection({ draft, mutateDraft }: DmProfileBasicSectionProps) {
  function handleBaseChange(field: 'name' | 'summary', value: string) {
    mutateDraft((next) => {
      next[field] = value;
    });
  }

  function handleDefaultChange(isDefault: boolean) {
    mutateDraft((next) => {
      next.isDefault = isDefault;
    });
  }

  return (
    <Section id="dm-section-basic" title="基础信息" description="名称与简介会展示在设置面板中。">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]" htmlFor="dm-profile-name">
            风格名称
          </Label>
          <Input
            id="dm-profile-name"
            value={draft.name}
            onChange={(event) => handleBaseChange('name', event.target.value)}
          />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs text-[var(--ink-soft)]" htmlFor="dm-profile-summary">
            简介
          </Label>
          <Textarea
            id="dm-profile-summary"
            rows={3}
            value={draft.summary}
            onChange={(event) => handleBaseChange('summary', event.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 lg:col-span-2">
          <div>
            <p className="text-xs font-semibold text-[var(--ink-strong)]">设为默认风格</p>
            <p className="text-[10px] text-[var(--ink-soft)]">默认风格会自动应用在设置中。</p>
          </div>
          <Switch checked={draft.isDefault} onCheckedChange={handleDefaultChange} aria-label="设为默认风格" />
        </div>
      </div>
    </Section>
  );
}
