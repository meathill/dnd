import type { AiProvider } from '../ai/ai-types';

export type UserSettings = {
  provider: AiProvider;
  model: string;
  dmProfileId: string | null;
};

export type SessionInfo = {
  userId: string;
  displayName: string;
  settings: UserSettings | null;
  isRoot: boolean;
};
