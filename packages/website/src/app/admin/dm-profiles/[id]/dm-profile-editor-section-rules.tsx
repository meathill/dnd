'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { DmGuidePhase, DmProfileRule } from '@/lib/game/types';
import { Section } from './dm-profile-editor-section';
import type { DraftMutator } from './dm-profile-editor-form';

type NewRuleDraft = {
  phase: DmGuidePhase;
  category: string;
  title: string;
  content: string;
  order: number;
  isEnabled: boolean;
};

type DmProfileRulesSectionProps = {
  rules: DmProfileRule[];
  mutateDraft: DraftMutator;
  onSaveRule: (rule: DmProfileRule) => Promise<void> | void;
  onCreateRule: (rule: NewRuleDraft) => Promise<boolean>;
  onRequestDeleteRule: (rule: DmProfileRule) => void;
  savingRuleId: string | null;
  deletingRuleId: string | null;
  isCreating: boolean;
};

const phaseOptions: { value: DmGuidePhase; label: string }[] = [
  { value: 'analysis', label: '分析阶段' },
  { value: 'narration', label: '叙事阶段' },
];

function buildNewRuleDraft(rules: DmProfileRule[]): NewRuleDraft {
  const maxOrder = rules.reduce((acc, rule) => Math.max(acc, rule.order), 0);
  return {
    phase: 'analysis',
    category: '',
    title: '',
    content: '',
    order: maxOrder + 1,
    isEnabled: true,
  };
}

export default function DmProfileRulesSection({
  rules,
  mutateDraft,
  onSaveRule,
  onCreateRule,
  onRequestDeleteRule,
  savingRuleId,
  deletingRuleId,
  isCreating,
}: DmProfileRulesSectionProps) {
  const [newRule, setNewRule] = useState<NewRuleDraft>(() => buildNewRuleDraft(rules));

  const sortedRules = useMemo(() => {
    const order = { analysis: 0, narration: 1 };
    return [...rules].sort((a, b) => {
      const phaseDiff = order[a.phase] - order[b.phase];
      if (phaseDiff !== 0) {
        return phaseDiff;
      }
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.title.localeCompare(b.title, 'zh-Hans-CN');
    });
  }, [rules]);

  function handleRuleFieldChange<T extends keyof DmProfileRule>(ruleId: string, field: T, value: DmProfileRule[T]) {
    mutateDraft((draft) => {
      const target = draft.rules.find((rule) => rule.id === ruleId);
      if (!target) {
        return;
      }
      target[field] = value;
    });
  }

  function handleRuleOrderChange(ruleId: string, value: string) {
    const nextValue = Number(value);
    handleRuleFieldChange(ruleId, 'order', Number.isNaN(nextValue) ? 0 : nextValue);
  }

  function handleNewRuleChange<T extends keyof NewRuleDraft>(field: T, value: NewRuleDraft[T]) {
    setNewRule((current) => ({ ...current, [field]: value }));
  }

  function handleNewRuleOrderChange(value: string) {
    const nextValue = Number(value);
    handleNewRuleChange('order', Number.isNaN(nextValue) ? 0 : nextValue);
  }

  async function handleCreateRule() {
    if (!newRule.title.trim() || !newRule.content.trim()) {
      return;
    }
    const success = await onCreateRule({
      ...newRule,
      title: newRule.title.trim(),
      content: newRule.content.trim(),
      category: newRule.category.trim(),
    });
    if (success) {
      setNewRule(buildNewRuleDraft(rules));
    }
  }

  return (
    <Section title="规则清单" description="拆分后的指导规则将覆盖全局指南。">
      <div className="space-y-3">
        <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--ink-strong)]">新增规则</p>
              <p className="text-[10px] text-[var(--ink-soft)]">建议先补充核心规则，再补充细节。</p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[10rem_1fr_7rem_7rem]">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="new-rule-phase">
                阶段
              </Label>
              <Select
                value={newRule.phase}
                onValueChange={(value) => handleNewRuleChange('phase', value as DmGuidePhase)}
              >
                <SelectTrigger id="new-rule-phase" size="sm">
                  <SelectValue placeholder="选择阶段" />
                </SelectTrigger>
                <SelectContent>
                  {phaseOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="new-rule-title">
                新规则标题
              </Label>
              <Input
                id="new-rule-title"
                value={newRule.title}
                onChange={(event) => handleNewRuleChange('title', event.target.value)}
                placeholder="例如：处理玩家越权"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="new-rule-category">
                类别
              </Label>
              <Input
                id="new-rule-category"
                value={newRule.category}
                onChange={(event) => handleNewRuleChange('category', event.target.value)}
                placeholder="例如：越权"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="new-rule-order">
                排序
              </Label>
              <Input
                id="new-rule-order"
                type="number"
                value={newRule.order}
                onChange={(event) => handleNewRuleOrderChange(event.target.value)}
              />
            </div>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_8rem]">
            <div className="space-y-1">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="new-rule-content">
                新规则内容
              </Label>
              <Textarea
                id="new-rule-content"
                rows={3}
                value={newRule.content}
                onChange={(event) => handleNewRuleChange('content', event.target.value)}
                placeholder="描述该规则的具体行为与约束。"
              />
            </div>
            <div className="flex flex-col items-start gap-2">
              <Label className="text-xs text-[var(--ink-soft)]">启用</Label>
              <Switch
                checked={newRule.isEnabled}
                onCheckedChange={(value) => handleNewRuleChange('isEnabled', value)}
                aria-label="新增规则启用"
              />
              <Button className="mt-auto w-full" disabled={isCreating} onClick={handleCreateRule} size="sm">
                {isCreating ? '添加中...' : '添加规则'}
              </Button>
            </div>
          </div>
        </div>

        {sortedRules.length === 0 ? (
          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 text-xs text-[var(--ink-soft)]">
            暂无规则，请先添加。
          </div>
        ) : (
          <div className="space-y-3">
            {sortedRules.map((rule) => {
              const isSaving = savingRuleId === rule.id;
              const isDeleting = deletingRuleId === rule.id;
              return (
                <div
                  className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3"
                  key={rule.id}
                >
                  <div className="grid gap-3 lg:grid-cols-[10rem_1fr_7rem_7rem]">
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--ink-soft)]" htmlFor={`rule-${rule.id}-phase`}>
                        阶段
                      </Label>
                      <Select
                        value={rule.phase}
                        onValueChange={(value) => handleRuleFieldChange(rule.id, 'phase', value as DmGuidePhase)}
                      >
                        <SelectTrigger id={`rule-${rule.id}-phase`} size="sm">
                          <SelectValue placeholder="选择阶段" />
                        </SelectTrigger>
                        <SelectContent>
                          {phaseOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--ink-soft)]" htmlFor={`rule-${rule.id}-title`}>
                        规则标题
                      </Label>
                      <Input
                        id={`rule-${rule.id}-title`}
                        value={rule.title}
                        onChange={(event) => handleRuleFieldChange(rule.id, 'title', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--ink-soft)]" htmlFor={`rule-${rule.id}-category`}>
                        类别
                      </Label>
                      <Input
                        id={`rule-${rule.id}-category`}
                        value={rule.category}
                        onChange={(event) => handleRuleFieldChange(rule.id, 'category', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--ink-soft)]" htmlFor={`rule-${rule.id}-order`}>
                        排序
                      </Label>
                      <Input
                        id={`rule-${rule.id}-order`}
                        type="number"
                        value={rule.order}
                        onChange={(event) => handleRuleOrderChange(rule.id, event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_10rem]">
                    <div className="space-y-1">
                      <Label className="text-xs text-[var(--ink-soft)]" htmlFor={`rule-${rule.id}-content`}>
                        规则内容
                      </Label>
                      <Textarea
                        id={`rule-${rule.id}-content`}
                        rows={3}
                        value={rule.content}
                        onChange={(event) => handleRuleFieldChange(rule.id, 'content', event.target.value)}
                      />
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <Label className="text-xs text-[var(--ink-soft)]">启用</Label>
                      <Switch
                        checked={rule.isEnabled}
                        onCheckedChange={(value) => handleRuleFieldChange(rule.id, 'isEnabled', value)}
                        aria-label={`启用规则 ${rule.title}`}
                      />
                      <Button
                        className="mt-auto w-full"
                        disabled={isSaving}
                        onClick={() => onSaveRule(rule)}
                        size="sm"
                        variant="outline"
                      >
                        {isSaving ? '保存中...' : '保存规则'}
                      </Button>
                      <Button
                        className="w-full"
                        disabled={isDeleting}
                        onClick={() => onRequestDeleteRule(rule)}
                        size="sm"
                        variant="destructive"
                      >
                        {isDeleting ? '删除中...' : '删除规则'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}
