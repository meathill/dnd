import { Button } from '../components/ui/button';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '../components/ui/number-field';
import { Textarea } from '../components/ui/textarea';
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
  const hasSkillBudget = skillPointBudget > 0;
  const remainingPoints = hasSkillBudget ? skillPointBudget - skillPointsUsed : 0;
  const isOverBudget = hasSkillBudget && remainingPoints < 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={fieldLabelClassName}>{hasSkillBudget ? '技能点分配' : '技能选择'}</p>
          {hasSkillBudget ? (
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
        {hasSkillBudget ? (
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
