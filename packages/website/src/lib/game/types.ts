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

export type SessionInfo = {
  userId: string;
  displayName: string;
  email: string;
  balance: number;
};
