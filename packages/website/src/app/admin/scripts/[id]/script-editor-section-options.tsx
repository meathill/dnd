'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { ATTRIBUTE_KEYS } from './script-editor-types';

type ScriptOptionsSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

const attributeLabels: Record<(typeof ATTRIBUTE_KEYS)[number], string> = {
  strength: '力量',
  dexterity: '敏捷',
  constitution: '体质',
  size: '体型',
  intelligence: '智力',
  willpower: '意志',
  appearance: '外貌',
  education: '教育',
};

export default function ScriptOptionsSection({ draft, mutateDraft }: ScriptOptionsSectionProps) {
  function handleBaseChange(field: keyof ScriptDraft, value: string) {
    mutateDraft((next) => {
      (next[field] as string) = value;
    });
  }

  function handleAttributeRangeChange(key: (typeof ATTRIBUTE_KEYS)[number], field: 'min' | 'max', value: string) {
    mutateDraft((next) => {
      next.attributeRanges[key][field] = value;
    });
  }

  return (
    <>
      <Section id="script-section-options" title="角色创建选项" description="每行一条，技能格式：id | 名称 | 分组。">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs text-[var(--ink-soft)]">技能选项</Label>
            <Textarea
              rows={4}
              value={draft.skillOptionsText}
              onChange={(event) => handleBaseChange('skillOptionsText', event.target.value)}
              placeholder="skill-persuade | 说服 | 社交"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">装备选项</Label>
            <Textarea
              rows={4}
              value={draft.equipmentOptionsText}
              onChange={(event) => handleBaseChange('equipmentOptionsText', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">职业选项</Label>
            <Textarea
              rows={4}
              value={draft.occupationOptionsText}
              onChange={(event) => handleBaseChange('occupationOptionsText', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">出身选项</Label>
            <Textarea
              rows={4}
              value={draft.originOptionsText}
              onChange={(event) => handleBaseChange('originOptionsText', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">Buff 选项</Label>
            <Textarea
              rows={4}
              value={draft.buffOptionsText}
              onChange={(event) => handleBaseChange('buffOptionsText', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">Debuff 选项</Label>
            <Textarea
              rows={4}
              value={draft.debuffOptionsText}
              onChange={(event) => handleBaseChange('debuffOptionsText', event.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section id="script-section-limits" title="属性与限制" description="角色创建时的预算与上限。">
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 lg:grid-cols-2 lg:col-span-2">
            {ATTRIBUTE_KEYS.map((key) => (
              <div className="grid gap-2" key={key}>
                <Label className="text-xs text-[var(--ink-soft)]">{attributeLabels[key]}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="最小值"
                    value={draft.attributeRanges[key].min}
                    onChange={(event) => handleAttributeRangeChange(key, 'min', event.target.value)}
                  />
                  <Input
                    placeholder="最大值"
                    value={draft.attributeRanges[key].max}
                    onChange={(event) => handleAttributeRangeChange(key, 'max', event.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">属性点预算</Label>
            <Input
              value={draft.attributePointBudget}
              onChange={(event) => handleBaseChange('attributePointBudget', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">技能上限</Label>
            <Input value={draft.skillLimit} onChange={(event) => handleBaseChange('skillLimit', event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">装备上限</Label>
            <Input
              value={draft.equipmentLimit}
              onChange={(event) => handleBaseChange('equipmentLimit', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">Buff 上限</Label>
            <Input value={draft.buffLimit} onChange={(event) => handleBaseChange('buffLimit', event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-[var(--ink-soft)]">Debuff 上限</Label>
            <Input
              value={draft.debuffLimit}
              onChange={(event) => handleBaseChange('debuffLimit', event.target.value)}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
