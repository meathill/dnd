'use client';

import type { DmProfileDetail, DmProfileRule } from '@/lib/game/types';
import DmProfileBasicSection from './dm-profile-editor-section-basic';
import DmProfileGuideSection from './dm-profile-editor-section-guides';
import DmProfileRulesSection from './dm-profile-editor-section-rules';

export type DraftMutator = (update: (draft: DmProfileDetail) => void) => void;

type DmProfileEditorFormProps = {
  draft: DmProfileDetail;
  onDraftChange: (next: DmProfileDetail | ((current: DmProfileDetail) => DmProfileDetail)) => void;
  onSaveRule: (rule: DmProfileRule) => Promise<void> | void;
  onCreateRule: (rule: {
    phase: DmProfileRule['phase'];
    category: string;
    title: string;
    content: string;
    order: number;
    isEnabled: boolean;
  }) => Promise<boolean>;
  onRequestDeleteRule: (rule: DmProfileRule) => void;
  savingRuleId: string | null;
  deletingRuleId: string | null;
  isCreatingRule: boolean;
};

export default function DmProfileEditorForm({
  draft,
  onDraftChange,
  onSaveRule,
  onCreateRule,
  onRequestDeleteRule,
  savingRuleId,
  deletingRuleId,
  isCreatingRule,
}: DmProfileEditorFormProps) {
  function mutateDraft(update: (next: DmProfileDetail) => void) {
    onDraftChange((current) => {
      const next = structuredClone(current);
      update(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <DmProfileBasicSection draft={draft} mutateDraft={mutateDraft} />
      <DmProfileGuideSection draft={draft} mutateDraft={mutateDraft} />
      <DmProfileRulesSection
        rules={draft.rules}
        mutateDraft={mutateDraft}
        onSaveRule={onSaveRule}
        onCreateRule={onCreateRule}
        onRequestDeleteRule={onRequestDeleteRule}
        savingRuleId={savingRuleId}
        deletingRuleId={deletingRuleId}
        isCreating={isCreatingRule}
      />
    </div>
  );
}
