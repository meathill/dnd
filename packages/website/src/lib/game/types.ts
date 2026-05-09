export type ModuleRecord = {
  id: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  data: Record<string, unknown>;
};

export type CharacterRecord = {
  id: string;
  moduleId: string;
  name: string;
  summary: string;
  data: Record<string, unknown>;
};

export type GameRecord = {
  id: string;
  userId: string;
  moduleId: string;
  characterId: string;
  opencodeSessionId: string;
  workspacePath: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type WalletRecord = {
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
};

export type BillingLedgerRecord = {
  id: string;
  userId: string;
  gameId: string | null;
  type: string;
  amount: number;
  balanceAfter: number;
  reason: string;
  createdAt: string;
};

export type GameMessageRecord = {
  id: string;
  gameId: string;
  role: 'user' | 'assistant';
  content: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type ModuleDraftStatus = 'draft' | 'published';

export type ModuleDraftRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  ownerUserId: string;
  meta: Record<string, unknown>;
  data: Record<string, unknown>;
  workspacePath: string;
  status: ModuleDraftStatus;
  publishedModuleId: string | null;
  skillSet: 'authoring' | 'play';
  agentSessionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ModuleDraftMessageRecord = {
  id: string;
  moduleDraftId: string;
  role: 'user' | 'assistant';
  content: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type UserRole = 'user' | 'editor';

export type UserAccountRecord = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: number;
};

export type SessionInfo = {
  userId: string;
  displayName: string;
  email: string;
  balance: number;
  role: UserRole;
  isAdmin: boolean;
};

export type GameRuntimeSession = Pick<SessionInfo, 'userId' | 'balance'>;

export type GameContext = {
  game: GameRecord;
  gameUrl: string;
  module: ModuleRecord | null;
  character: CharacterRecord | null;
  messages: GameMessageRecord[];
};

export type GameTurnReply = {
  userMessage: GameMessageRecord;
  assistantMessage: GameMessageRecord;
  balance: number;
};
