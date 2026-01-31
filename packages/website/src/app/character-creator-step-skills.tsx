import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '../components/ui/number-field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import type { QuickstartAssignments, QuickstartSkillConfig } from '../lib/game/rules';
import type { SkillAllocationMode } from '../lib/game/types';
import {
  fieldLabelClassName,
  type FormState,
  type SkillId,
  type SkillOption,
  type ToggleSkill,
  type UpdateField,
} from './character-creator-data';

type CharacterCreatorStepSkillsProps = {
  formState: FormState;
  skillOptions: SkillOption[];
  skillBaseValues: Record<string, number>;
  skillPointBudget: number;
  skillPointsUsed: number;
  skillMaxValue: number;
  skillAllocationMode: SkillAllocationMode;
  quickstartConfig: QuickstartSkillConfig;
  quickstartAssignments: QuickstartAssignments;
  onUpdateQuickstartCore: (skillId: SkillId, value: number | null) => void;
  onToggleQuickstartInterest: (skillId: SkillId) => void;
  equipmentOptions: string[];
  selectedEquipment: string[];
  selectedSkills: SkillOption[];
  onToggleSkill: ToggleSkill;
  onUpdateSkillValue: (skillId: SkillId, value: number) => void;
  onToggleEquipment: (equipment: string) => void;
  onFieldChange: UpdateField;
  skillLimit?: number;
  equipmentLimit?: number;
  skillError?: string;
  skillPointError?: string;
  equipmentError?: string;
};

export default function CharacterCreatorStepSkills({
  formState,
  skillOptions,
  skillBaseValues,
  skillPointBudget,
  skillPointsUsed,
  skillMaxValue,
  skillAllocationMode,
  quickstartConfig,
  quickstartAssignments,
  onUpdateQuickstartCore,
  onToggleQuickstartInterest,
  equipmentOptions,
  selectedEquipment,
  selectedSkills,
  onToggleSkill,
  onUpdateSkillValue,
  onToggleEquipment,
  onFieldChange,
  skillLimit = 0,
  equipmentLimit = 0,
  skillError,
  skillPointError,
  equipmentError,
}: CharacterCreatorStepSkillsProps) {
  const isEquipmentRestricted = equipmentOptions.length > 0;
  const isQuickstart = skillAllocationMode === 'quickstart';
  const hasSkillBudget = skillPointBudget > 0;
  const remainingPoints = hasSkillBudget ? skillPointBudget - skillPointsUsed : 0;
  const isOverBudget = hasSkillBudget && remainingPoints < 0;
  const coreValueLimits: Record<number, number> = {};
  quickstartConfig.coreValues.forEach((value) => {
    coreValueLimits[value] = (coreValueLimits[value] ?? 0) + 1;
  });
  const coreUsage: Record<number, number> = {};
  Object.values(quickstartAssignments.core).forEach((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return;
    }
    coreUsage[value] = (coreUsage[value] ?? 0) + 1;
  });
  const coreSelectedCount = Object.values(quickstartAssignments.core).filter(
    (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
  ).length;
  const interestSelectedCount = Object.values(quickstartAssignments.interest).filter(Boolean).length;
  const uniqueCoreValues = Array.from(new Set(quickstartConfig.coreValues)).sort((a, b) => b - a);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={fieldLabelClassName}>
            {isQuickstart ? '快速分配' : hasSkillBudget ? '技能点分配' : '技能选择'}
          </p>
          {isQuickstart ? (
            <span className="text-xs text-[var(--ink-soft)]">
              核心 {coreSelectedCount} / {quickstartConfig.coreValues.length} · 兴趣 {interestSelectedCount} /{' '}
              {quickstartConfig.interestCount}
            </span>
          ) : hasSkillBudget ? (
            <span className={`text-xs ${isOverBudget ? 'text-[var(--accent-ember)]' : 'text-[var(--ink-soft)]'}`}>
              已用 {skillPointsUsed} / {skillPointBudget}
              {isOverBudget ? `，超出 ${Math.abs(remainingPoints)}` : `，剩余 ${remainingPoints}`}
            </span>
          ) : skillLimit > 0 ? (
            <span className="text-xs text-[var(--ink-soft)]">
              已选 {selectedSkills.length} / {skillLimit}
            </span>
          ) : null}
        </div>
        {isQuickstart ? (
          <div className="space-y-4">
            <div className="panel-muted space-y-3 rounded-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">核心技能</p>
              {skillOptions.map((skill) => {
                const baseValue = skillBaseValues[skill.id] ?? 0;
                const assignedValue = quickstartAssignments.core[skill.id];
                return (
                  <div className="flex items-center justify-between gap-3" key={skill.id}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink-strong)]">{skill.label}</p>
                      <p className="text-xs text-[var(--ink-soft)]">
                        {skill.group} · 基础 {baseValue}
                      </p>
                    </div>
                    <Select
                      value={typeof assignedValue === 'number' ? String(assignedValue) : 'none'}
                      onValueChange={(value) =>
                        onUpdateQuickstartCore(skill.id, value === 'none' ? null : Number(value))
                      }
                    >
                      <SelectTrigger className="h-8 w-[140px] rounded-lg" size="sm" aria-label={`${skill.label}核心值`}>
                        <SelectValue placeholder="核心值" />
                      </SelectTrigger>
                      <SelectPopup>
                        <SelectItem value="none">不分配</SelectItem>
                        {uniqueCoreValues.map((value) => {
                          const limit = coreValueLimits[value] ?? 0;
                          const used = coreUsage[value] ?? 0;
                          const remaining = limit - used + (assignedValue === value ? 1 : 0);
                          const disabled = remaining <= 0 && assignedValue !== value;
                          const label = limit > 1 ? `${value}（剩 ${remaining}）` : `${value}`;
                          return (
                            <SelectItem key={`${skill.id}-${value}`} value={String(value)} disabled={disabled}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectPopup>
                    </Select>
                  </div>
                );
              })}
            </div>
            <div className="panel-muted space-y-3 rounded-lg p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-soft)]">兴趣技能</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {skillOptions.map((skill) => {
                  const baseValue = skillBaseValues[skill.id] ?? 0;
                  const isCore = Boolean(quickstartAssignments.core[skill.id]);
                  const isChecked = quickstartAssignments.interest[skill.id] ?? false;
                  const disableToggle =
                    isCore || (!isChecked && interestSelectedCount >= quickstartConfig.interestCount);
                  return (
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                        isChecked
                          ? 'border-[rgba(61,82,56,0.4)] bg-[rgba(61,82,56,0.12)] text-[var(--accent-moss)]'
                          : 'border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]'
                      } ${disableToggle ? 'cursor-not-allowed opacity-70' : ''}`}
                      key={skill.id}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={disableToggle}
                        onCheckedChange={() => onToggleQuickstartInterest(skill.id)}
                      />
                      <span className="text-sm font-semibold text-[var(--ink-strong)]">{skill.label}</span>
                      <span className="text-[10px] text-[var(--ink-soft)]">
                        {baseValue} → {baseValue + quickstartConfig.interestBonus}
                      </span>
                      {isCore ? <span className="text-[10px] text-[var(--ink-soft)]">已为核心</span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        ) : hasSkillBudget ? (
          <div className="space-y-3">
            {skillOptions.map((skill) => {
              const baseValue = skillBaseValues[skill.id] ?? 0;
              const currentValue = formState.skills[skill.id] ?? baseValue;
              const delta = Math.max(0, currentValue - baseValue);
              const maxValue = skillMaxValue > 0 ? skillMaxValue : undefined;
              return (
                <div
                  className="panel-muted flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  key={skill.id}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink-strong)]">{skill.label}</p>
                    <p className="text-xs text-[var(--ink-soft)]">
                      {skill.group} · 基础 {baseValue} · 已加 {delta}
                    </p>
                  </div>
                  <NumberField
                    className="w-[132px]"
                    min={baseValue}
                    max={maxValue}
                    step={1}
                    value={currentValue}
                    onValueChange={(value) => onUpdateSkillValue(skill.id, value ?? baseValue)}
                  >
                    <NumberFieldGroup className="h-8 rounded-lg">
                      <NumberFieldDecrement />
                      <NumberFieldInput aria-label={`${skill.label}技能值`} />
                      <NumberFieldIncrement />
                    </NumberFieldGroup>
                  </NumberField>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {skillOptions.map((skill) => {
              const baseValue = skillBaseValues[skill.id] ?? 0;
              const currentValue = formState.skills[skill.id] ?? baseValue;
              const isSelected = currentValue > baseValue;
              return (
                <Button
                  className={`flex h-auto items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                    isSelected
                      ? 'border-[rgba(61,82,56,0.4)] bg-[rgba(61,82,56,0.12)] text-[var(--accent-moss)]'
                      : 'border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]'
                  }`}
                  onClick={() => onToggleSkill(skill.id)}
                  type="button"
                  key={skill.id}
                  variant="ghost"
                >
                  <span>{skill.label}</span>
                  <span className="text-xs text-[var(--ink-soft)]">{skill.group}</span>
                </Button>
              );
            })}
          </div>
        )}
        {skillPointError ? <p className="text-xs text-[var(--accent-ember)]">{skillPointError}</p> : null}
        {skillError ? <p className="text-xs text-[var(--accent-ember)]">{skillError}</p> : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={fieldLabelClassName}>装备与道具</p>
          {equipmentLimit > 0 ? (
            <span className="text-xs text-[var(--ink-soft)]">
              已选 {selectedEquipment.length} / {equipmentLimit}
            </span>
          ) : null}
        </div>
        {equipmentOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2 rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.5)] p-3 text-xs">
            {equipmentOptions.map((item) => {
              const isSelected = selectedEquipment.includes(item);
              return (
                <Button
                  className={`h-auto rounded-lg px-3 py-1 text-xs transition ${
                    isSelected
                      ? 'bg-[rgba(182,121,46,0.18)] text-[var(--accent-brass)]'
                      : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-muted)]'
                  }`}
                  key={item}
                  onClick={() => onToggleEquipment(item)}
                  type="button"
                  variant="ghost"
                >
                  {item}
                </Button>
              );
            })}
          </div>
        ) : null}
        <Textarea
          className={`min-h-[160px] bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)] ${
            isEquipmentRestricted ? 'cursor-not-allowed opacity-80' : ''
          }`}
          placeholder={isEquipmentRestricted ? '从清单选择装备' : '用逗号分隔物品，例如：圣水、手电筒'}
          readOnly={isEquipmentRestricted}
          rows={6}
          value={formState.inventory}
          onChange={(event) => onFieldChange('inventory', event.target.value)}
        />
        {equipmentError ? <p className="text-xs text-[var(--accent-ember)]">{equipmentError}</p> : null}
        <div className="panel-muted rounded-lg p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">已选技能</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSkills.length === 0 ? (
              <span className="text-xs text-[var(--ink-soft)]">暂无选择</span>
            ) : (
              selectedSkills.map((skill) => (
                <span
                  className="rounded-lg bg-[rgba(61,82,56,0.12)] px-3 py-1 text-xs text-[var(--accent-moss)]"
                  key={skill.id}
                >
                  {skill.label} {formState.skills[skill.id] ?? skillBaseValues[skill.id] ?? 0}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
