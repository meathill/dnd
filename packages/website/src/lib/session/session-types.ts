import type { AiProvider } from '../ai/ai-types';

export type UserSettings = {
  provider: AiProvider;
  model: string;
};

export type SessionInfo = {
  userId: string;
  displayName: string;
  settings: UserSettings | null;
};
