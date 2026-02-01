'use client';

import type { ScriptDraft } from './script-editor-types';
import ScriptBasicSection from './script-editor-section-basic';
import ScriptOpeningSection from './script-editor-section-opening';
import ScriptBackgroundSection from './script-editor-section-background';
import ScriptStructureSection from './script-editor-section-structure';
import ScriptNpcSection from './script-editor-section-npcs';
import ScriptOptionsSection from './script-editor-section-options';
import ScriptRulesSection from './script-editor-section-rules';

export type DraftMutator = (update: (draft: ScriptDraft) => void) => void;

type ScriptEditorFormProps = {
  draft: ScriptDraft;
  onDraftChange: (next: ScriptDraft | ((current: ScriptDraft) => ScriptDraft)) => void;
};

export default function ScriptEditorForm({ draft, onDraftChange }: ScriptEditorFormProps) {
  function mutateDraft(update: (next: ScriptDraft) => void) {
    onDraftChange((current) => {
      const next = structuredClone(current);
      update(next);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <ScriptBasicSection draft={draft} mutateDraft={mutateDraft} />
      <ScriptOpeningSection draft={draft} mutateDraft={mutateDraft} />
      <ScriptBackgroundSection draft={draft} mutateDraft={mutateDraft} />
      <ScriptStructureSection draft={draft} mutateDraft={mutateDraft} />
      <ScriptNpcSection draft={draft} mutateDraft={mutateDraft} />
      <ScriptOptionsSection draft={draft} mutateDraft={mutateDraft} />
      <ScriptRulesSection draft={draft} mutateDraft={mutateDraft} />
    </div>
  );
}
