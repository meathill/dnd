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

export type ScriptEncounter = {
  id: string;
  title: string;
  summary: string;
  enemies: string[];
  danger: string;
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
  attributes: Record<AttributeKey, number>;
  skills: Record<string, boolean>;
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
