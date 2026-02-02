'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';

type ScriptRulesSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptRulesSection({ draft, mutateDraft }: ScriptRulesSectionProps) {
  function handleRuleChange<T extends keyof ScriptDraft['rules']>(field: T, value: ScriptDraft['rules'][T]) {
    mutateDraft((next) => {
      next.rules[field] = value;
    });
  }

  function resolveSkillAllocationMode(value: string | null): ScriptDraft['rules']['skillAllocationMode'] {
    if (value === 'budget' || value === 'selection' || value === 'quickstart') {
      return value;
    }
    return '';
  }

  return (
    <Section id="script-section-rules" title="规则覆盖" description="仅填写需要覆盖默认规则的部分。">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">默认 DC</Label>
          <Input
            value={draft.rules.defaultCheckDc}
            onChange={(event) => handleRuleChange('defaultCheckDc', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">DC 覆盖（key: value）</Label>
          <Textarea
            rows={3}
            value={draft.rules.checkDcOverridesText}
            onChange={(event) => handleRuleChange('checkDcOverridesText', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">受训技能值</Label>
          <Input
            value={draft.rules.skillValueTrained}
            onChange={(event) => handleRuleChange('skillValueTrained', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">未训练技能值</Label>
          <Input
            value={draft.rules.skillValueUntrained}
            onChange={(event) => handleRuleChange('skillValueUntrained', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">技能点预算</Label>
          <Input
            value={draft.rules.skillPointBudget}
            onChange={(event) => handleRuleChange('skillPointBudget', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">技能最大值</Label>
          <Input
            value={draft.rules.skillMaxValue}
            onChange={(event) => handleRuleChange('skillMaxValue', event.target.value)}
          />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-xs text-[var(--ink-soft)]">技能基础值（key: value）</Label>
          <Textarea
            rows={3}
            value={draft.rules.skillBaseValuesText}
            onChange={(event) => handleRuleChange('skillBaseValuesText', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">分配方式</Label>
          <Select
            value={draft.rules.skillAllocationMode || 'default'}
            onValueChange={(value) => handleRuleChange('skillAllocationMode', resolveSkillAllocationMode(value))}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="保持默认" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">保持默认</SelectItem>
              <SelectItem value="budget">预算制</SelectItem>
              <SelectItem value="selection">选取制</SelectItem>
              <SelectItem value="quickstart">快速开卡</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">快速开卡核心值</Label>
          <Textarea
            rows={2}
            value={draft.rules.quickstartCoreValuesText}
            onChange={(event) => handleRuleChange('quickstartCoreValuesText', event.target.value)}
            placeholder="每行一个数字"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">兴趣技能数量</Label>
          <Input
            value={draft.rules.quickstartInterestCount}
            onChange={(event) => handleRuleChange('quickstartInterestCount', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-[var(--ink-soft)]">兴趣技能加值</Label>
          <Input
            value={draft.rules.quickstartInterestBonus}
            onChange={(event) => handleRuleChange('quickstartInterestBonus', event.target.value)}
          />
        </div>
      </div>
    </Section>
  );
}
