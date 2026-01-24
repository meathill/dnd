'use client';

import { useEffect, useMemo, useState } from 'react';
import CharacterCreatorModal from './character-creator-modal';
import CharacterCreatorStepContent from './character-creator-step-content';
import {
  buildAttributeErrorMessage,
  findErrorStep,
  getRandomInRange,
  parseInventoryList,
} from './character-creator-utils';
import {
  buildAttributeOptions,
  buildDefaultFormState,
  calculateAttributeTotal,
  defaultBuffOptions,
  defaultDebuffOptions,
  defaultSkillOptions,
  steps,
  type AttributeKey,
  type AttributeRangeMap,
  type BuffId,
  type DebuffId,
  type FormState,
  type SkillId,
  type SkillOption,
  type SubmitResult,
} from './character-creator-data';
import type { CharacterFieldErrors } from '../lib/game/types';
import { resolveAttributePointBudget, resolveAttributeRanges } from '../lib/game/rules';

type CharacterCreatorProps = {
  onComplete?: (formState: FormState) => SubmitResult | Promise<SubmitResult>;
  variant?: 'full' | 'compact';
  openRequestId?: number;
  skillOptions?: SkillOption[];
  equipmentOptions?: string[];
  occupationOptions?: string[];
  originOptions?: string[];
  buffOptions?: string[];
  debuffOptions?: string[];
  attributeRanges?: AttributeRangeMap;
  attributePointBudget?: number;
  skillLimit?: number;
  equipmentLimit?: number;
  buffLimit?: number;
  debuffLimit?: number;
  isDisabled?: boolean;
};

export default function CharacterCreator({
  onComplete,
  variant = 'full',
  openRequestId,
  skillOptions,
  equipmentOptions = [],
  occupationOptions = [],
  originOptions = [],
  buffOptions,
  debuffOptions,
  attributeRanges,
  attributePointBudget,
  skillLimit = 0,
  equipmentLimit = 0,
  buffLimit = 0,
  debuffLimit = 0,
  isDisabled = false,
}: CharacterCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<CharacterFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const activeSkillOptions = skillOptions ?? defaultSkillOptions;
  const effectiveAttributeRanges = useMemo(() => resolveAttributeRanges(attributeRanges), [attributeRanges]);
  const activeAttributeOptions = useMemo(
    () => buildAttributeOptions(effectiveAttributeRanges),
    [effectiveAttributeRanges],
  );
  const activeBuffOptions = buffOptions && buffOptions.length > 0 ? buffOptions : Array.from(defaultBuffOptions);
  const activeDebuffOptions =
    debuffOptions && debuffOptions.length > 0 ? debuffOptions : Array.from(defaultDebuffOptions);
  const effectiveAttributePointBudget = useMemo(
    () => resolveAttributePointBudget(attributePointBudget),
    [attributePointBudget],
  );
  const [formState, setFormState] = useState<FormState>(() =>
    buildDefaultFormState({
      attributeOptions: activeAttributeOptions,
      attributePointBudget: effectiveAttributePointBudget,
      skillOptions: activeSkillOptions,
      skillLimit,
      occupationOptions,
      originOptions,
      inventory: equipmentOptions.length > 0 ? '' : undefined,
      buffOptions: activeBuffOptions,
      debuffOptions: activeDebuffOptions,
    }),
  );
  const showSecondaryActions = variant === 'full';
  const selectedSkills = useMemo<SkillOption[]>(
    () => activeSkillOptions.filter((skill) => formState.skills[skill.id]),
    [activeSkillOptions, formState.skills],
  );
  const inventoryList = useMemo(() => parseInventoryList(formState.inventory), [formState.inventory]);
  const attributePointTotal = useMemo(() => calculateAttributeTotal(formState.attributes), [formState.attributes]);
  const attributeBudgetErrorMessage =
    effectiveAttributePointBudget > 0 && attributePointTotal > effectiveAttributePointBudget
      ? `属性点总和超出上限 ${effectiveAttributePointBudget}`
      : '';
  const isOverAttributeBudget = Boolean(attributeBudgetErrorMessage);

  function openCreator() {
    if (isDisabled) {
      return;
    }
    setIsOpen(true);
  }

  function closeCreator() {
    setIsOpen(false);
  }

  function resetCreator() {
    setFormState(
      buildDefaultFormState({
        attributeOptions: activeAttributeOptions,
        attributePointBudget: effectiveAttributePointBudget,
        skillOptions: activeSkillOptions,
        skillLimit,
        occupationOptions,
        originOptions,
        inventory: equipmentOptions.length > 0 ? '' : undefined,
        buffOptions: activeBuffOptions,
        debuffOptions: activeDebuffOptions,
      }),
    );
    setFieldErrors({});
    setSubmitError('');
    setCurrentStep(0);
  }

  function goNextStep() {
    setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function goPreviousStep() {
    setCurrentStep((value) => Math.max(value - 1, 0));
  }

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldErrors((prev) => {
      if (!prev[key as keyof CharacterFieldErrors]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key as keyof CharacterFieldErrors];
      return next;
    });
  }

  function updateAttribute(attributeKey: AttributeKey, value: number) {
    setFormState((current) => ({
      ...current,
      attributes: {
        ...current.attributes,
        [attributeKey]: value,
      },
    }));
    setFieldErrors((prev) => {
      if (!prev.attributes && !prev.attributeErrors) {
        return prev;
      }
      const next = { ...prev };
      if (next.attributeErrors) {
        const nextAttributeErrors = { ...next.attributeErrors };
        delete nextAttributeErrors[attributeKey];
        next.attributeErrors = Object.keys(nextAttributeErrors).length > 0 ? nextAttributeErrors : undefined;
      }
      if (next.attributeErrors === undefined) {
        delete next.attributes;
      }
      return next;
    });
  }

  function toggleSkill(skillId: SkillId) {
    setFormState((current) => ({
      ...current,
      skills: (() => {
        const isSelected = current.skills[skillId];
        if (!isSelected && skillLimit > 0) {
          const selectedCount = Object.values(current.skills).filter(Boolean).length;
          if (selectedCount >= skillLimit) {
            setFieldErrors((prev) => ({ ...prev, skills: `技能最多选择 ${skillLimit} 项` }));
            return current.skills;
          }
        }
        const nextSkills = { ...current.skills, [skillId]: !current.skills[skillId] };
        setFieldErrors((prev) => {
          if (!prev.skills) {
            return prev;
          }
          const next = { ...prev };
          delete next.skills;
          return next;
        });
        return nextSkills;
      })(),
    }));
  }

  function toggleEquipment(item: string) {
    setFormState((current) => {
      const items = parseInventoryList(current.inventory);
      const exists = items.includes(item);
      if (!exists && equipmentLimit > 0 && items.length >= equipmentLimit) {
        setFieldErrors((prev) => ({ ...prev, inventory: `装备最多选择 ${equipmentLimit} 件` }));
        return current;
      }
      const nextItems = exists ? items.filter((entry) => entry !== item) : [...items, item];
      setFieldErrors((prev) => {
        if (!prev.inventory) {
          return prev;
        }
        const next = { ...prev };
        delete next.inventory;
        return next;
      });
      return {
        ...current,
        inventory: nextItems.join('、'),
      };
    });
  }

  function toggleBuff(buff: BuffId) {
    setFormState((current) => {
      const exists = current.buffs.includes(buff);
      if (buffLimit === 1) {
        const nextList = exists ? [] : [buff];
        setFieldErrors((prev) => {
          if (!prev.buffs) {
            return prev;
          }
          const next = { ...prev };
          delete next.buffs;
          return next;
        });
        return {
          ...current,
          buffs: nextList,
        };
      }
      if (!exists && buffLimit > 0 && current.buffs.length >= buffLimit) {
        setFieldErrors((prev) => ({ ...prev, buffs: `增益状态最多选择 ${buffLimit} 个` }));
        return current;
      }
      const nextList = exists ? current.buffs.filter((item) => item !== buff) : [...current.buffs, buff];
      setFieldErrors((prev) => {
        if (!prev.buffs) {
          return prev;
        }
        const next = { ...prev };
        delete next.buffs;
        return next;
      });
      return {
        ...current,
        buffs: nextList,
      };
    });
  }

  function toggleDebuff(debuff: DebuffId) {
    setFormState((current) => {
      const exists = current.debuffs.includes(debuff);
      if (debuffLimit === 1) {
        const nextList = exists ? [] : [debuff];
        setFieldErrors((prev) => {
          if (!prev.debuffs) {
            return prev;
          }
          const next = { ...prev };
          delete next.debuffs;
          return next;
        });
        return {
          ...current,
          debuffs: nextList,
        };
      }
      if (!exists && debuffLimit > 0 && current.debuffs.length >= debuffLimit) {
        setFieldErrors((prev) => ({ ...prev, debuffs: `减益状态最多选择 ${debuffLimit} 个` }));
        return current;
      }
      const nextList = exists ? current.debuffs.filter((item) => item !== debuff) : [...current.debuffs, debuff];
      setFieldErrors((prev) => {
        if (!prev.debuffs) {
          return prev;
        }
        const next = { ...prev };
        delete next.debuffs;
        return next;
      });
      return {
        ...current,
        debuffs: nextList,
      };
    });
  }

  function applyAverageAttributes() {
    setFormState((current) => {
      const nextAttributes = { ...current.attributes };
      activeAttributeOptions.forEach((attribute) => {
        nextAttributes[attribute.id] = Math.round((attribute.min + attribute.max) / 2);
      });
      return {
        ...current,
        attributes: nextAttributes,
      };
    });
  }

  function applyRandomAttributes() {
    setFormState((current) => {
      const nextAttributes = { ...current.attributes };
      activeAttributeOptions.forEach((attribute) => {
        nextAttributes[attribute.id] = getRandomInRange(attribute.min, attribute.max);
      });
      return {
        ...current,
        attributes: nextAttributes,
      };
    });
  }

  async function handleComplete() {
    setSubmitError('');
    if (!onComplete) {
      closeCreator();
      return;
    }
    const result = await onComplete(formState);
    if (!result || result.ok) {
      closeCreator();
      return;
    }
    const errors = result.fieldErrors ?? {};
    setFieldErrors(errors);
    setSubmitError(result.message ?? '人物卡校验失败');
    const errorStep = findErrorStep(errors);
    if (errorStep !== null) {
      setCurrentStep(errorStep);
    }
  }

  useEffect(() => {
    if (!openRequestId) {
      return;
    }
    openCreator();
  }, [openRequestId]);

  return (
    <div className="flex flex-wrap gap-3">
      <button
        className={`rounded-lg px-4 py-2 text-sm text-white shadow-[0_12px_30px_-18px_var(--accent-brass)] transition ${
          isDisabled ? 'bg-[rgba(182,121,46,0.4)]' : 'bg-[var(--accent-brass)] hover:-translate-y-0.5'
        }`}
        onClick={openCreator}
        disabled={isDisabled}
        type="button"
      >
        创建角色
      </button>
      {showSecondaryActions ? (
        <button
          className="rounded-lg border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-4 py-2 text-sm text-[var(--ink-strong)] transition hover:-translate-y-0.5 hover:border-[var(--accent-brass)]"
          type="button"
        >
          载入模组
        </button>
      ) : null}
      {showSecondaryActions ? (
        <button
          className="rounded-lg border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-4 py-2 text-sm text-[var(--ink-strong)] transition hover:-translate-y-0.5 hover:border-[var(--accent-brass)]"
          type="button"
        >
          开始冒险
        </button>
      ) : null}

      <CharacterCreatorModal
        isOpen={isOpen}
        currentStep={currentStep}
        steps={steps}
        submitError={submitError}
        onClose={closeCreator}
        onReset={resetCreator}
        onPrevious={goPreviousStep}
        onNext={goNextStep}
        onComplete={handleComplete}
        isNextDisabled={currentStep === 1 && isOverAttributeBudget}
      >
        <CharacterCreatorStepContent
          currentStep={currentStep}
          formState={formState}
          fieldErrors={fieldErrors}
          occupationOptions={occupationOptions}
          originOptions={originOptions}
          attributeOptions={activeAttributeOptions}
          attributeErrorMessage={buildAttributeErrorMessage(fieldErrors, attributeBudgetErrorMessage)}
          attributePointBudget={effectiveAttributePointBudget}
          attributePointTotal={attributePointTotal}
          onFieldChange={updateField}
          onAttributeChange={updateAttribute}
          onApplyAverage={applyAverageAttributes}
          onApplyRandom={applyRandomAttributes}
          skillOptions={activeSkillOptions}
          equipmentOptions={equipmentOptions}
          selectedEquipment={inventoryList}
          selectedSkills={selectedSkills}
          onToggleSkill={toggleSkill}
          onToggleEquipment={toggleEquipment}
          skillLimit={skillLimit}
          equipmentLimit={equipmentLimit}
          buffOptions={activeBuffOptions}
          debuffOptions={activeDebuffOptions}
          onToggleBuff={toggleBuff}
          onToggleDebuff={toggleDebuff}
          buffLimit={buffLimit}
          debuffLimit={debuffLimit}
        />
      </CharacterCreatorModal>
    </div>
  );
}
