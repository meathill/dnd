import type { AttributeKey, ScriptOpeningMessage, ScriptRuleOverrides } from '@/lib/game/types';

export type OpeningMessageDraft = ScriptOpeningMessage;

export type StoryArcDraft = {
  id: string;
  title: string;
  summary: string;
  beatsText: string;
  revealsText: string;
};

export type SceneDraft = {
  id: string;
  title: string;
  summary: string;
  location: string;
  hooksText: string;
};

export type EncounterDraft = {
  id: string;
  title: string;
  summary: string;
  npcsText: string;
  danger: string;
};

export type NpcProfileDraft = {
  id: string;
  name: string;
  type: string;
  role: string;
  threat: string;
  summary: string;
  useWhen: string;
  status: string;
  hp: string;
  armor: string;
  move: string;
  attacksText: string;
  skillsText: string;
  traitsText: string;
  tactics: string;
  weakness: string;
  sanityLoss: string;
};

export type RuleDraft = {
  defaultCheckDc: string;
  checkDcOverridesText: string;
  skillValueTrained: string;
  skillValueUntrained: string;
  skillPointBudget: string;
  skillMaxValue: string;
  skillBaseValuesText: string;
  skillAllocationMode: ScriptRuleOverrides['skillAllocationMode'] | '';
  quickstartCoreValuesText: string;
  quickstartInterestCount: string;
  quickstartInterestBonus: string;
};

export type OccupationDraft = {
  id: string;
  name: string;
  summary: string;
  skillIdsText: string;
  equipmentText: string;
};

export type ScriptDraft = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  openingMessages: OpeningMessageDraft[];
  background: {
    overview: string;
    truth: string;
    themesText: string;
    factionsText: string;
    locationsText: string;
    secretsText: string;
  };
  storyArcs: StoryArcDraft[];
  npcProfiles: NpcProfileDraft[];
  skillOptionsText: string;
  equipmentOptionsText: string;
  occupationOptions: OccupationDraft[];
  originOptionsText: string;
  buffOptionsText: string;
  debuffOptionsText: string;
  attributeRanges: Record<AttributeKey, { min: string; max: string }>;
  attributePointBudget: string;
  skillLimit: string;
  equipmentLimit: string;
  buffLimit: string;
  debuffLimit: string;
  rules: RuleDraft;
  scenes: SceneDraft[];
  encounters: EncounterDraft[];
};

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'strength',
  'dexterity',
  'constitution',
  'size',
  'intelligence',
  'willpower',
  'appearance',
  'education',
];
