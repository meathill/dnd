export type SessionInfo = {
  userId: string;
  displayName: string;
  email: string;
  balance: number;
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

export type GameMessageRecord = {
  id: string;
  gameId: string;
  role: 'user' | 'assistant';
  content: string;
  meta: Record<string, unknown>;
  createdAt: string;
};

export type GameContext = {
  game: GameRecord;
  playUrl: string;
  module: ModuleRecord | null;
  character: CharacterRecord | null;
  messages: GameMessageRecord[];
};

export type PlayReply = {
  userMessage: GameMessageRecord;
  assistantMessage: GameMessageRecord;
  balance: number;
};
