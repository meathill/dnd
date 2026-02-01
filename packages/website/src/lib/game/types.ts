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

export type ScriptStoryArc = {
  id: string;
  title: string;
  summary: string;
  beats: string[];
  reveals: string[];
};

export type ScriptBackground = {
  overview: string;
  truth: string;
  themes: string[];
  factions: string[];
  locations: string[];
  secrets: string[];
};

export type ScriptEnemyAttack = {
  name: string;
  chance: number;
  damage: string;
  effect?: string;
};

export type ScriptEnemySkill = {
  name: string;
  value: number;
};

export type ScriptEnemyProfile = {
  id: string;
  name: string;
  type: string;
  threat: string;
  summary: string;
  hp: number;
  armor?: number;
  move?: number;
  attacks: ScriptEnemyAttack[];
  skills: ScriptEnemySkill[];
  traits: string[];
  tactics: string;
  weakness: string;
  sanityLoss: string;
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
  background: ScriptBackground;
  storyArcs: ScriptStoryArc[];
  enemyProfiles: ScriptEnemyProfile[];
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

export type GameMemoryRoundSummary = {
  round: number;
  summary: string;
};

export type GameMemoryNpc = {
  name: string;
  status: string;
  relation?: string;
  location?: string;
  notes?: string;
  isAlly?: boolean;
};

export type GameMemoryLocation = {
  name: string;
  status: string;
  notes?: string;
};

export type GameMemoryThread = {
  title: string;
  status: 'open' | 'resolved' | 'blocked';
  notes?: string;
};

export type GameMemoryFlag = {
  key: string;
  value: string;
};

export type GameMemoryVitals = {
  hp?: { current: number; max: number };
  sanity?: { current: number; max: number };
  magic?: { current: number; max: number };
};

export type GameMemoryPresence = {
  location?: string;
  scene?: string;
  presentNpcs: string[];
};

export type GameMemoryState = {
  allies: string[];
  npcs: GameMemoryNpc[];
  locations: GameMemoryLocation[];
  threads: GameMemoryThread[];
  flags: GameMemoryFlag[];
  notes: string[];
  dmNotes: string[];
  vitals: GameMemoryVitals;
  presence: GameMemoryPresence;
  mapText: string;
};

export type GameMemoryRecord = {
  id: string;
  gameId: string;
  lastRoundIndex: number;
  lastProcessedAt: string;
  shortSummary: string;
  longSummary: string;
  recentRounds: GameMemoryRoundSummary[];
  state: GameMemoryState;
  createdAt: string;
  updatedAt: string;
};

export type GameMemorySnapshot = {
  vitals: GameMemoryVitals;
  presence: GameMemoryPresence;
  mapText: string;
};

export type GameMemoryMapRecord = {
  id: string;
  gameId: string;
  roundIndex: number;
  content: string;
  createdAt: string;
};
