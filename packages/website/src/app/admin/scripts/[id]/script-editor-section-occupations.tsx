'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { createOccupationDraft } from './script-editor-mappers';

type ScriptOccupationSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptOccupationSection({ draft, mutateDraft }: ScriptOccupationSectionProps) {
  function handleOccupationChange(index: number, field: keyof ScriptDraft['occupationOptions'][number], value: string) {
    mutateDraft((next) => {
      next.occupationOptions[index][field] = value;
    });
  }

  function handleAddOccupation() {
    mutateDraft((next) => {
      next.occupationOptions.push(createOccupationDraft());
    });
  }

  function handleRemoveOccupation(index: number) {
    mutateDraft((next) => {
      next.occupationOptions.splice(index, 1);
    });
  }

  return (
    <Section
      id="script-section-occupations"
      title="职业预设"
      description="为每个职业设置默认技能与装备，技能请填写技能 ID。"
    >
      {draft.occupationOptions.length === 0 ? (
        <p className="text-xs text-[var(--ink-soft)]">暂无职业，请添加职业预设。</p>
      ) : (
        <div className="space-y-3">
          {draft.occupationOptions.map((occupation, index) => (
            <div
              className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3"
              key={occupation.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--ink-strong)]">{occupation.name || '未命名职业'}</p>
                <Button onClick={() => handleRemoveOccupation(index)} size="xs" variant="outline">
                  删除
                </Button>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--ink-soft)]">职业名称</Label>
                  <Input
                    value={occupation.name}
                    onChange={(event) => handleOccupationChange(index, 'name', event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--ink-soft)]">职业说明</Label>
                  <Input
                    value={occupation.summary}
                    onChange={(event) => handleOccupationChange(index, 'summary', event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--ink-soft)]">预设技能（每行一个技能 ID）</Label>
                  <Textarea
                    rows={4}
                    value={occupation.skillIdsText}
                    onChange={(event) => handleOccupationChange(index, 'skillIdsText', event.target.value)}
                    placeholder="spotHidden"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-[var(--ink-soft)]">预设装备（每行一个）</Label>
                  <Textarea
                    rows={4}
                    value={occupation.equipmentText}
                    onChange={(event) => handleOccupationChange(index, 'equipmentText', event.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleAddOccupation} size="sm" variant="outline">
        添加职业
      </Button>
    </Section>
  );
}
