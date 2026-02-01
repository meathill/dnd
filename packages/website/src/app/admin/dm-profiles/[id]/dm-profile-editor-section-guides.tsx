'use client';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DmProfileDetail } from '@/lib/game/types';
import { Section } from './dm-profile-editor-section';
import type { DraftMutator } from './dm-profile-editor-form';

type DmProfileGuideSectionProps = {
  draft: DmProfileDetail;
  mutateDraft: DraftMutator;
};

export default function DmProfileGuideSection({ draft, mutateDraft }: DmProfileGuideSectionProps) {
  function handleGuideChange(field: 'analysisGuide' | 'narrationGuide', value: string) {
    mutateDraft((next) => {
      next[field] = value;
    });
  }

  return (
    <Section title="全局指南" description="这部分会拼接在 AI 的系统提示中。">
      <div className="grid gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]" htmlFor="dm-profile-analysis-guide">
            初步验证指南
          </Label>
          <Textarea
            id="dm-profile-analysis-guide"
            rows={4}
            value={draft.analysisGuide}
            onChange={(event) => handleGuideChange('analysisGuide', event.target.value)}
            placeholder="用于意图解析、合法性检查、拆分行动等。"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]" htmlFor="dm-profile-narration-guide">
            具体叙事指南
          </Label>
          <Textarea
            id="dm-profile-narration-guide"
            rows={4}
            value={draft.narrationGuide}
            onChange={(event) => handleGuideChange('narrationGuide', event.target.value)}
            placeholder="用于生成叙事文本与 DM 行为准则。"
          />
        </div>
      </div>
    </Section>
  );
}
