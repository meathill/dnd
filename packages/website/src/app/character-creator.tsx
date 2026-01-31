'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import CharacterCreatorModal from './character-creator-modal';
import CharacterCreatorStepContent from './character-creator-step-content';
import {
  buildAttributeErrorMessage,
  buildRandomAttributes,
  findErrorStep,
  parseInventoryList,
} from './character-creator-utils';
import {
  buildAttributeOptions,
  buildDefaultFormState,
  calculateAttributeTotal,
  defaultBuffOptions,
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
import type { CharacterFieldErrors, ScriptRuleOverrides } from '../lib/game/types';
import {
  buildQuickstartSkillValues,
  deriveQuickstartAssignments,
  type QuickstartAssignments,
  resolveAttributePointBudget,
  resolveAttributeRanges,
  normalizeQuickstartSkillConfig,
  resolveQuickstartSkillConfig,
  resolveSkillAllocationMode,
  resolveSkillMaxValue,
  resolveSkillPointBudget,
  resolveTrainedSkillValue,
  resolveUntrainedSkillValue,
  rollLuck,
} from '../lib/game/rules';

const DEFAULT_BUFF_OPTIONS = Array.from(defaultBuffOptions);
const EMPTY_OPTIONS: string[] = [];

type CharacterCreatorProps = {
  onComplete?: (formState: FormState) => SubmitResult | Promise<SubmitResult>;
  variant?: 'full' | 'compact';
  openRequestId?: number;
  mode?: 'create' | 'edit' | 'copy';
  initialFormState?: FormState;
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
  rules?: ScriptRuleOverrides;
  isDisabled?: boolean;
  onRequestOpen?: () => void;
};

export default function CharacterCreator({
  onComplete,
  variant = 'full',
  openRequestId,
  mode = 'create',
  initialFormState,
  skillOptions,
  equipmentOptions,
  occupationOptions,
  originOptions,
  buffOptions,
  debuffOptions,
  attributeRanges,
  attributePointBudget,
  skillLimit = 0,
  equipmentLimit = 0,
  buffLimit = 0,
  debuffLimit = 0,
  rules,
  isDisabled = false,
  onRequestOpen,
}: CharacterCreatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<CharacterFieldErrors>({});
  const [submitError, setSubmitError] = useState('');
  const activeSkillOptions = skillOptions ?? defaultSkillOptions;
  const activeEquipmentOptions = equipmentOptions ?? EMPTY_OPTIONS;
  const activeOccupationOptions = occupationOptions ?? EMPTY_OPTIONS;
  const activeOriginOptions = originOptions ?? EMPTY_OPTIONS;
  const effectiveAttributeRanges = useMemo(() => resolveAttributeRanges(attributeRanges), [attributeRanges]);
  const activeAttributeOptions = useMemo(
    () => buildAttributeOptions(effectiveAttributeRanges),
    [effectiveAttributeRanges],
  );
  const activeBuffOptions = buffOptions && buffOptions.length > 0 ? buffOptions : DEFAULT_BUFF_OPTIONS;
  const activeDebuffOptions = debuffOptions && debuffOptions.length > 0 ? debuffOptions : EMPTY_OPTIONS;
  const shouldShowDebuff = debuffLimit > 0 && activeDebuffOptions.length > 0;
  const effectiveAttributePointBudget = useMemo(
    () => resolveAttributePointBudget(attributePointBudget),
    [attributePointBudget],
  );
  const trainedSkillValue = useMemo(() => resolveTrainedSkillValue(rules), [rules]);
  const untrainedSkillValue = useMemo(() => resolveUntrainedSkillValue(rules), [rules]);
  const skillMaxValue = useMemo(() => resolveSkillMaxValue(rules), [rules]);
  const skillAllocationMode = useMemo(() => resolveSkillAllocationMode(rules), [rules]);
  const quickstartRawConfig = useMemo(() => resolveQuickstartSkillConfig(rules), [rules]);
  const quickstartConfig = useMemo(
    () => normalizeQuickstartSkillConfig(quickstartRawConfig, activeSkillOptions.length),
    [activeSkillOptions.length, quickstartRawConfig],
  );
  const skillBaseValueMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeSkillOptions.forEach((skill) => {
      const baseValue = rules?.skillBaseValues?.[skill.id];
      map[skill.id] = typeof baseValue === 'number' && Number.isFinite(baseValue) ? baseValue : untrainedSkillValue;
    });
    return map;
  }, [activeSkillOptions, rules?.skillBaseValues, untrainedSkillValue]);
  const seedFormState = useMemo(() => {
    const base = buildDefaultFormState({
      attributeOptions: activeAttributeOptions,
      attributePointBudget: effectiveAttributePointBudget,
      skillOptions: activeSkillOptions,
      skillLimit,
      rules,
      occupationOptions: activeOccupationOptions,
      originOptions: activeOriginOptions,
      inventory: activeEquipmentOptions.length > 0 ? '' : undefined,
      buffOptions: activeBuffOptions,
      debuffOptions: shouldShowDebuff ? activeDebuffOptions : [],
      debuffLimit: shouldShowDebuff ? debuffLimit : 0,
    });
    if (!initialFormState) {
      return base;
    }
    return {
      ...base,
      ...initialFormState,
      attributes: {
        ...base.attributes,
        ...initialFormState.attributes,
      },
      skills: {
        ...base.skills,
        ...initialFormState.skills,
      },
      buffs: initialFormState.buffs ?? base.buffs,
      debuffs: shouldShowDebuff ? (initialFormState.debuffs ?? base.debuffs) : [],
    };
  }, [
    activeAttributeOptions,
    activeSkillOptions,
    activeBuffOptions,
    activeDebuffOptions,
    activeEquipmentOptions.length,
    activeOccupationOptions,
    activeOriginOptions,
    debuffLimit,
    effectiveAttributePointBudget,
    initialFormState,
    rules,
    skillLimit,
    shouldShowDebuff,
  ]);
  const [formState, setFormState] = useState<FormState>(seedFormState);
  const [quickstartAssignments, setQuickstartAssignments] = useState<QuickstartAssignments>(() =>
    deriveQuickstartAssignments(
      activeSkillOptions.map((skill) => skill.id),
      seedFormState.skills,
      skillBaseValueMap,
      quickstartConfig,
    ),
  );
  useEffect(() => {
    setQuickstartAssignments(
      deriveQuickstartAssignments(
        activeSkillOptions.map((skill) => skill.id),
        seedFormState.skills,
        skillBaseValueMap,
        quickstartConfig,
      ),
    );
  }, [activeSkillOptions, quickstartConfig, seedFormState.skills, skillBaseValueMap]);
  const skillPointBudget = useMemo(
    () => (skillAllocationMode === 'budget' ? resolveSkillPointBudget(rules, formState.attributes) : 0),
    [formState.attributes, rules, skillAllocationMode],
  );
  useEffect(() => {
    if (skillAllocationMode !== 'quickstart') {
      return;
    }
    const nextSkills = buildQuickstartSkillValues(
      activeSkillOptions.map((skill) => skill.id),
      skillBaseValueMap,
      quickstartAssignments,
      quickstartConfig,
    );
    setFormState((current) => ({
      ...current,
      skills: {
        ...current.skills,
        ...nextSkills,
      },
    }));
  }, [activeSkillOptions, quickstartAssignments, quickstartConfig, skillAllocationMode, skillBaseValueMap]);
  const showSecondaryActions = variant === 'full';
  const selectedSkills = useMemo<SkillOption[]>(
    () =>
      activeSkillOptions.filter((skill) => {
        const baseValue = skillBaseValueMap[skill.id] ?? untrainedSkillValue;
        const value = formState.skills[skill.id] ?? baseValue;
        return value > baseValue;
      }),
    [activeSkillOptions, formState.skills, skillBaseValueMap, untrainedSkillValue],
  );
  const quickstartCoreUsage = useMemo(() => {
    const usage: Record<number, number> = {};
    Object.values(quickstartAssignments.core).forEach((value) => {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return;
      }
      usage[value] = (usage[value] ?? 0) + 1;
    });
    return usage;
  }, [quickstartAssignments.core]);
  const quickstartCoreLimits = useMemo(() => {
    const limits: Record<number, number> = {};
    quickstartConfig.coreValues.forEach((value) => {
      limits[value] = (limits[value] ?? 0) + 1;
    });
    return limits;
  }, [quickstartConfig.coreValues]);
  const quickstartCoreSelected = useMemo(
    () =>
      Object.values(quickstartAssignments.core).filter(
        (value) => typeof value === 'number' && Number.isFinite(value) && value > 0,
      ).length,
    [quickstartAssignments.core],
  );
  const quickstartInterestSelected = useMemo(
    () => Object.values(quickstartAssignments.interest).filter(Boolean).length,
    [quickstartAssignments.interest],
  );
  const quickstartCoreOverflow = useMemo(
    () =>
      Object.entries(quickstartCoreUsage).some(([value, count]) => count > (quickstartCoreLimits[Number(value)] ?? 0)),
    [quickstartCoreLimits, quickstartCoreUsage],
  );
  const quickstartInterestOverflow = quickstartInterestSelected > quickstartConfig.interestCount;
  const inventoryList = useMemo(() => parseInventoryList(formState.inventory), [formState.inventory]);
  const attributePointTotal = useMemo(() => calculateAttributeTotal(formState.attributes), [formState.attributes]);
  const attributeBudgetErrorMessage =
    effectiveAttributePointBudget > 0 && attributePointTotal > effectiveAttributePointBudget
      ? `属性点总和超出上限 ${effectiveAttributePointBudget}`
      : '';
  const isOverAttributeBudget = Boolean(attributeBudgetErrorMessage);
  const skillPointsUsed = useMemo(() => {
    if (skillPointBudget <= 0) {
      return 0;
    }
    return activeSkillOptions.reduce((sum, skill) => {
      const baseValue = skillBaseValueMap[skill.id] ?? untrainedSkillValue;
      const value = formState.skills[skill.id] ?? baseValue;
      return sum + Math.max(0, value - baseValue);
    }, 0);
  }, [activeSkillOptions, formState.skills, skillBaseValueMap, skillPointBudget, untrainedSkillValue]);
  const quickstartRequiredCore = quickstartConfig.coreValues.length;
  const quickstartCoreMissing = Math.max(0, quickstartRequiredCore - quickstartCoreSelected);
  const quickstartInterestMissing = Math.max(0, quickstartConfig.interestCount - quickstartInterestSelected);
  const quickstartErrorMessage =
    skillAllocationMode === 'quickstart'
      ? quickstartCoreOverflow
        ? '核心技能分配超出可用值'
        : quickstartInterestOverflow
          ? `兴趣技能最多选择 ${quickstartConfig.interestCount} 项`
          : quickstartCoreMissing > 0
            ? `核心技能还需分配 ${quickstartCoreMissing} 项`
            : quickstartInterestMissing > 0
              ? `兴趣技能还需选择 ${quickstartInterestMissing} 项`
              : ''
      : '';
  const skillPointErrorMessage =
    skillAllocationMode === 'budget' && skillPointBudget > 0 && skillPointsUsed > skillPointBudget
      ? `技能点数超出预算 ${skillPointBudget}`
      : quickstartErrorMessage;
  const isOverSkillBudget = Boolean(skillPointErrorMessage);
  const debuffRequiredErrorMessage =
    shouldShowDebuff && formState.debuffs.length < debuffLimit ? `减益状态需要选择 ${debuffLimit} 个` : '';
  const debuffErrorMessage = fieldErrors.debuffs ?? debuffRequiredErrorMessage;
  const shouldDisableButton = isDisabled && !onRequestOpen;

  function openCreator(force = false) {
    if (isDisabled && !force) {
      return;
    }
    setIsOpen(true);
  }

  function handleRequestOpen() {
    if (isDisabled) {
      if (onRequestOpen) {
        onRequestOpen();
      }
      return;
    }
    if (onRequestOpen) {
      onRequestOpen();
      return;
    }
    openCreator();
  }

  function closeCreator() {
    setIsOpen(false);
  }

  function resetCreator() {
    setFormState(seedFormState);
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
    if (skillPointBudget > 0) {
      return;
    }
    setFormState((current) => ({
      ...current,
      skills: (() => {
        const baseValue = skillBaseValueMap[skillId] ?? untrainedSkillValue;
        const currentValue = current.skills[skillId] ?? baseValue;
        const isSelected = currentValue > baseValue;
        if (!isSelected && skillLimit > 0) {
          const selectedCount = activeSkillOptions.filter((skill) => {
            const value = current.skills[skill.id] ?? skillBaseValueMap[skill.id] ?? untrainedSkillValue;
            const base = skillBaseValueMap[skill.id] ?? untrainedSkillValue;
            return value > base;
          }).length;
          if (selectedCount >= skillLimit) {
            setFieldErrors((prev) => ({ ...prev, skills: `技能最多选择 ${skillLimit} 项` }));
            return current.skills;
          }
        }
        const nextValue = isSelected ? baseValue : Math.max(baseValue, trainedSkillValue);
        const nextSkills = { ...current.skills, [skillId]: nextValue };
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

  function updateQuickstartCore(skillId: SkillId, value: number | null) {
    if (skillAllocationMode !== 'quickstart') {
      return;
    }
    setQuickstartAssignments((current) => {
      const currentValue = current.core[skillId];
      if (currentValue === value) {
        return current;
      }
      if (typeof value === 'number') {
        const nextUsage: Record<number, number> = {};
        Object.entries(current.core).forEach(([key, assigned]) => {
          if (key === skillId) {
            return;
          }
          if (typeof assigned === 'number' && Number.isFinite(assigned)) {
            nextUsage[assigned] = (nextUsage[assigned] ?? 0) + 1;
          }
        });
        const limit = quickstartCoreLimits[value] ?? 0;
        const used = nextUsage[value] ?? 0;
        if (used >= limit) {
          return current;
        }
      }
      const nextCore = { ...current.core, [skillId]: value };
      const nextInterest = { ...current.interest };
      if (value !== null) {
        nextInterest[skillId] = false;
      }
      setFieldErrors((prev) => {
        if (!prev.skills) {
          return prev;
        }
        const next = { ...prev };
        delete next.skills;
        return next;
      });
      return { core: nextCore, interest: nextInterest };
    });
  }

  function toggleQuickstartInterest(skillId: SkillId) {
    if (skillAllocationMode !== 'quickstart') {
      return;
    }
    setQuickstartAssignments((current) => {
      if (current.core[skillId]) {
        return current;
      }
      const isSelected = current.interest[skillId];
      const selectedCount = Object.values(current.interest).filter(Boolean).length;
      if (!isSelected && selectedCount >= quickstartConfig.interestCount) {
        return current;
      }
      const nextInterest = { ...current.interest, [skillId]: !isSelected };
      setFieldErrors((prev) => {
        if (!prev.skills) {
          return prev;
        }
        const next = { ...prev };
        delete next.skills;
        return next;
      });
      return { ...current, interest: nextInterest };
    });
  }

  function updateSkillValue(skillId: SkillId, value: number) {
    const baseValue = skillBaseValueMap[skillId] ?? untrainedSkillValue;
    const maxValue = skillMaxValue > 0 ? skillMaxValue : Infinity;
    const nextValue = Math.min(Math.max(value, baseValue), maxValue);
    setFormState((current) => ({
      ...current,
      skills: {
        ...current.skills,
        [skillId]: nextValue,
      },
    }));
    setFieldErrors((prev) => {
      if (!prev.skills) {
        return prev;
      }
      const next = { ...prev };
      delete next.skills;
      return next;
    });
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
      const nextAttributes = buildRandomAttributes(activeAttributeOptions, effectiveAttributePointBudget);
      return {
        ...current,
        attributes: nextAttributes,
        luck: rollLuck(),
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
    setFormState(seedFormState);
    setFieldErrors({});
    setSubmitError('');
    setCurrentStep(0);
    openCreator(true);
  }, [openRequestId, seedFormState]);

  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={handleRequestOpen} disabled={shouldDisableButton} aria-disabled={isDisabled} size="sm">
        创建角色
      </Button>
      {showSecondaryActions ? (
        <Button size="sm" variant="outline">
          载入模组
        </Button>
      ) : null}
      {showSecondaryActions ? (
        <Button size="sm" variant="outline">
          开始冒险
        </Button>
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
        isNextDisabled={
          (currentStep === 1 && isOverAttributeBudget) ||
          (currentStep === 2 && isOverSkillBudget) ||
          (currentStep === 3 && Boolean(debuffRequiredErrorMessage))
        }
        submitLabel={mode === 'edit' ? '保存修改' : mode === 'copy' ? '创建副本' : '创建角色'}
        title={mode === 'edit' ? '编辑人物卡' : mode === 'copy' ? '复制人物卡' : '创建人物卡'}
      >
        <CharacterCreatorStepContent
          currentStep={currentStep}
          formState={formState}
          fieldErrors={fieldErrors}
          occupationOptions={activeOccupationOptions}
          originOptions={activeOriginOptions}
          attributeOptions={activeAttributeOptions}
          attributeErrorMessage={buildAttributeErrorMessage(fieldErrors, attributeBudgetErrorMessage)}
          attributePointBudget={effectiveAttributePointBudget}
          attributePointTotal={attributePointTotal}
          onFieldChange={updateField}
          onAttributeChange={updateAttribute}
          onApplyAverage={applyAverageAttributes}
          onApplyRandom={applyRandomAttributes}
          skillOptions={activeSkillOptions}
          skillBaseValues={skillBaseValueMap}
          skillPointBudget={skillPointBudget}
          skillPointsUsed={skillPointsUsed}
          skillMaxValue={skillMaxValue}
          skillAllocationMode={skillAllocationMode}
          quickstartConfig={quickstartConfig}
          quickstartAssignments={quickstartAssignments}
          onUpdateQuickstartCore={updateQuickstartCore}
          onToggleQuickstartInterest={toggleQuickstartInterest}
          skillPointError={skillPointErrorMessage}
          equipmentOptions={activeEquipmentOptions}
          selectedEquipment={inventoryList}
          selectedSkills={selectedSkills}
          onToggleSkill={toggleSkill}
          onUpdateSkillValue={updateSkillValue}
          onToggleEquipment={toggleEquipment}
          skillLimit={skillLimit}
          equipmentLimit={equipmentLimit}
          buffOptions={activeBuffOptions}
          debuffOptions={shouldShowDebuff ? activeDebuffOptions : []}
          onToggleBuff={toggleBuff}
          onToggleDebuff={toggleDebuff}
          buffLimit={buffLimit}
          debuffLimit={shouldShowDebuff ? debuffLimit : 0}
          buffError={fieldErrors.buffs}
          debuffError={debuffErrorMessage}
        />
      </CharacterCreatorModal>
    </div>
  );
}
