import type { CharacterFieldErrors } from '../lib/game/types';
import CharacterCreatorStepAttributes from './character-creator-step-attributes';
import CharacterCreatorStepBackground from './character-creator-step-background';
import CharacterCreatorStepBasic from './character-creator-step-basic';
import CharacterCreatorStepSkills from './character-creator-step-skills';
import CharacterCreatorStepSummary from './character-creator-step-summary';
import type {
  AttributeOption,
  BuffId,
  DebuffId,
  FormState,
  SkillOption,
  SkillId,
  UpdateAttribute,
  UpdateField,
} from './character-creator-data';

export type CharacterCreatorStepContentProps = {
  currentStep: number;
  formState: FormState;
  fieldErrors: CharacterFieldErrors;
  occupationOptions?: string[];
  originOptions?: string[];
  attributeOptions: AttributeOption[];
  attributeErrorMessage?: string;
  attributePointBudget: number;
  attributePointTotal: number;
  onFieldChange: UpdateField;
  onAttributeChange: UpdateAttribute;
  onApplyAverage: () => void;
  onApplyRandom: () => void;
  skillOptions: SkillOption[];
  skillBaseValues: Record<string, number>;
  skillPointBudget: number;
  skillPointsUsed: number;
  skillMaxValue: number;
  skillPointError?: string;
  equipmentOptions: string[];
  selectedEquipment: string[];
  selectedSkills: SkillOption[];
  onToggleSkill: (skillId: SkillId) => void;
  onUpdateSkillValue: (skillId: SkillId, value: number) => void;
  onToggleEquipment: (item: string) => void;
  skillLimit: number;
  equipmentLimit: number;
  buffOptions: string[];
  debuffOptions: string[];
  onToggleBuff: (buff: BuffId) => void;
  onToggleDebuff: (debuff: DebuffId) => void;
  buffLimit: number;
  debuffLimit: number;
};

export default function CharacterCreatorStepContent({
  currentStep,
  formState,
  fieldErrors,
  occupationOptions,
  originOptions,
  attributeOptions,
  attributeErrorMessage,
  attributePointBudget,
  attributePointTotal,
  onFieldChange,
  onAttributeChange,
  onApplyAverage,
  onApplyRandom,
  skillOptions,
  skillBaseValues,
  skillPointBudget,
  skillPointsUsed,
  skillMaxValue,
  skillPointError,
  equipmentOptions,
  selectedEquipment,
  selectedSkills,
  onToggleSkill,
  onUpdateSkillValue,
  onToggleEquipment,
  skillLimit,
  equipmentLimit,
  buffOptions,
  debuffOptions,
  onToggleBuff,
  onToggleDebuff,
  buffLimit,
  debuffLimit,
}: CharacterCreatorStepContentProps) {
  return (
    <>
      {currentStep === 0 ? (
        <CharacterCreatorStepBasic
          formState={formState}
          onFieldChange={onFieldChange}
          occupationOptions={occupationOptions}
          originOptions={originOptions}
          errors={fieldErrors}
        />
      ) : null}
      {currentStep === 1 ? (
        <CharacterCreatorStepAttributes
          formState={formState}
          attributeOptions={attributeOptions}
          onAttributeChange={onAttributeChange}
          onApplyAverage={onApplyAverage}
          onApplyRandom={onApplyRandom}
          attributeErrorMessage={attributeErrorMessage}
          attributeErrors={fieldErrors.attributeErrors}
          attributePointBudget={attributePointBudget}
          attributePointTotal={attributePointTotal}
        />
      ) : null}
      {currentStep === 2 ? (
        <CharacterCreatorStepSkills
          formState={formState}
          skillOptions={skillOptions}
          skillBaseValues={skillBaseValues}
          skillPointBudget={skillPointBudget}
          skillPointsUsed={skillPointsUsed}
          skillMaxValue={skillMaxValue}
          equipmentOptions={equipmentOptions}
          selectedEquipment={selectedEquipment}
          selectedSkills={selectedSkills}
          onToggleSkill={onToggleSkill}
          onUpdateSkillValue={onUpdateSkillValue}
          onToggleEquipment={onToggleEquipment}
          onFieldChange={onFieldChange}
          skillLimit={skillLimit}
          equipmentLimit={equipmentLimit}
          skillError={fieldErrors.skills}
          skillPointError={skillPointError}
          equipmentError={fieldErrors.inventory}
        />
      ) : null}
      {currentStep === 3 ? (
        <CharacterCreatorStepBackground
          formState={formState}
          onFieldChange={onFieldChange}
          onToggleBuff={onToggleBuff}
          onToggleDebuff={onToggleDebuff}
          buffOptions={buffOptions}
          debuffOptions={debuffOptions}
          buffLimit={buffLimit}
          debuffLimit={debuffLimit}
          buffError={fieldErrors.buffs}
          debuffError={fieldErrors.debuffs}
        />
      ) : null}
      {currentStep === 4 ? (
        <CharacterCreatorStepSummary
          formState={formState}
          selectedSkills={selectedSkills}
          inventoryList={selectedEquipment}
          attributeOptions={attributeOptions}
        />
      ) : null}
    </>
  );
}
