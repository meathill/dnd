import type { AttributeKey } from '../lib/game/types';
import {
  fieldLabelClassName,
  inputClassName,
  getAttributeTooltip,
  type AttributeOption,
  type FormState,
  type UpdateAttribute,
} from './character-creator-data';

type CharacterCreatorStepAttributesProps = {
  formState: FormState;
  attributeOptions: AttributeOption[];
  onAttributeChange: UpdateAttribute;
  onApplyAverage: () => void;
  onApplyRandom: () => void;
  attributeErrorMessage?: string;
  attributeErrors?: Partial<Record<AttributeKey, string>>;
  attributePointBudget?: number;
  attributePointTotal?: number;
};

export default function CharacterCreatorStepAttributes({
  formState,
  attributeOptions,
  onAttributeChange,
  onApplyAverage,
  onApplyRandom,
  attributeErrorMessage,
  attributeErrors,
  attributePointBudget,
  attributePointTotal,
}: CharacterCreatorStepAttributesProps) {
  const minRange = Math.min(...attributeOptions.map((option) => option.min));
  const maxRange = Math.max(...attributeOptions.map((option) => option.max));
  const hasBudget = Boolean(
    attributePointBudget && attributePointBudget > 0 && typeof attributePointTotal === 'number',
  );
  const remaining = hasBudget ? (attributePointBudget as number) - (attributePointTotal as number) : 0;
  const isOverBudget = hasBudget && remaining < 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={fieldLabelClassName}>基础属性</p>
          <p className="text-sm text-[var(--ink-muted)]">
            遵循剧本范围：{minRange} - {maxRange}。
          </p>
          {hasBudget ? (
            <p className={`mt-1 text-xs ${isOverBudget ? 'text-[var(--accent-ember)]' : 'text-[var(--ink-soft)]'}`}>
              已用 {attributePointTotal} / {attributePointBudget}
              {isOverBudget ? `，超出 ${Math.abs(remaining)}` : `，剩余 ${remaining}`}
            </p>
          ) : null}
          {attributeErrorMessage ? (
            <p className="mt-1 text-xs text-[var(--accent-ember)]">{attributeErrorMessage}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
            onClick={onApplyAverage}
            type="button"
          >
            平均值
          </button>
          <button
            className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
            onClick={onApplyRandom}
            type="button"
          >
            随机生成
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {attributeOptions.map((attribute) => {
          const recommendedBase = attribute.recommendedMin ?? attribute.min;
          const recommendedMin = Math.min(Math.max(recommendedBase, attribute.min), attribute.max);
          const currentValue = formState.attributes[attribute.id];
          const isBelowRecommended = currentValue < recommendedMin;
          return (
            <div className="panel-muted flex flex-col gap-2 rounded-xl px-4 py-3" key={attribute.id}>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-sm font-semibold text-[var(--ink-strong)]"
                    title={getAttributeTooltip(attribute.id)}
                  >
                    {attribute.label}
                  </p>
                  <p className="text-xs text-[var(--ink-soft)]">{attribute.group}</p>
                </div>
                <span className="text-xs text-[var(--ink-soft)]">
                  {attribute.min}-{attribute.max}
                </span>
              </div>
              <input
                className={inputClassName}
                max={attribute.max}
                min={attribute.min}
                type="number"
                value={currentValue}
                onChange={(event) => onAttributeChange(attribute.id, Number(event.target.value) || attribute.min)}
              />
              <p className={`text-xs ${isBelowRecommended ? 'text-[var(--accent-brass)]' : 'text-[var(--ink-soft)]'}`}>
                {isBelowRecommended ? `低于规则推荐最低值 ${recommendedMin}` : `规则推荐最低值 ${recommendedMin}`}
              </p>
              {attributeErrors?.[attribute.id] ? (
                <p className="text-xs text-[var(--accent-ember)]">{attributeErrors[attribute.id]}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
