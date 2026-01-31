export type ScriptScene = {
  id: string;
  title: string;
  summary: string;
  location: string;
  hooks: string[];
};

export type ScriptSkillOption = {
  id: string;
  label: string;
  group: string;
};

export type ScriptOpeningMessage = {
  role: 'dm' | 'system' | 'player';
  content: string;
  speaker?: string;
};

export type ScriptEncounter = {
  id: string;
  title: string;
  summary: string;
  enemies: string[];
  danger: string;
};

export type ScriptRuleOverrides = {
  defaultCheckDc?: number;
  checkDcOverrides?: Record<string, number>;
  skillValueTrained?: number;
  skillValueUntrained?: number;
  skillPointBudget?: number;
  skillMaxValue?: number;
  skillBaseValues?: Record<string, number>;
  skillAllocationMode?: SkillAllocationMode;
  quickstartCoreValues?: number[];
  quickstartInterestCount?: number;
  quickstartInterestBonus?: number;
};

export type GameRuleOverrides = {
  checkDcOverrides?: Record<string, number>;
};

export type ChatRole = 'dm' | 'player' | 'system';

export type ChatModule =
  | {
      type: 'narrative';
      content: string;
    }
  | {
      type: 'dice';
      content: string;
    }
  | {
      type: 'map';
      content: string;
    }
  | {
      type: 'suggestions';
      items: string[];
    }
  | {
      type: 'notice';
      content: string;
    };

export type ChatMessage = {
  id: string;
  role: ChatRole;
  speaker: string;
  time: string;
  content: string;
  modules?: ChatModule[];
  isStreaming?: boolean;
};

export type DmGuidePhase = 'analysis' | 'narration';

export type DmProfile = {
  id: string;
  name: string;
  summary: string;
  analysisGuide: string;
  narrationGuide: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DmProfileSummary = {
  id: string;
  name: string;
  summary: string;
  isDefault: boolean;
};

export type DmProfileRule = {
  id: string;
  dmProfileId: string;
  phase: DmGuidePhase;
  category: string;
  title: string;
  content: string;
  order: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SkillAllocationMode = 'budget' | 'selection' | 'quickstart';

export type DmProfileDetail = DmProfile & {
  rules: DmProfileRule[];
};

export type AttributeKey =
  | 'strength'
  | 'dexterity'
  | 'constitution'
  | 'size'
  | 'intelligence'
  | 'willpower'
  | 'appearance'
  | 'education';

export type AttributeRange = {
  min: number;
  max: number;
};

export type AttributeRangeMap = Partial<Record<AttributeKey, AttributeRange>>;

export type CharacterFieldErrors = {
  name?: string;
  occupation?: string;
  origin?: string;
  attributes?: string;
  attributeErrors?: Partial<Record<AttributeKey, string>>;
  skills?: string;
  inventory?: string;
  buffs?: string;
  debuffs?: string;
};

export type ScriptDefinition = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  openingMessages: ScriptOpeningMessage[];
  skillOptions: ScriptSkillOption[];
  equipmentOptions: string[];
  occupationOptions: string[];
  originOptions: string[];
  buffOptions: string[];
  debuffOptions: string[];
  attributeRanges: AttributeRangeMap;
  attributePointBudget: number;
  skillLimit: number;
  equipmentLimit: number;
  buffLimit: number;
  debuffLimit: number;
  rules: ScriptRuleOverrides;
  scenes: ScriptScene[];
  encounters: ScriptEncounter[];
};

export type CharacterRecord = {
  id: string;
  scriptId: string;
  name: string;
  occupation: string;
  age: string;
  origin: string;
  appearance: string;
  background: string;
  motivation: string;
  avatar: string;
  luck: number;
  attributes: Record<AttributeKey, number>;
  skills: Record<string, number>;
  inventory: string[];
  buffs: string[];
  debuffs: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type GameRecord = {
  id: string;
  scriptId: string;
  characterId: string;
  status: string;
  ruleOverrides: GameRuleOverrides;
  createdAt: string;
  updatedAt: string;
};

export type GameRecordSummary = {
  id: string;
  scriptId: string;
  scriptTitle: string;
  characterId: string;
  characterName: string;
  status: string;
  updatedAt: string;
};

export type GameMessageRecord = {
  id: string;
  gameId: string;
  role: ChatRole;
  speaker: string;
  content: string;
  modules: ChatModule[];
  createdAt: string;
  updatedAt: string;
};
