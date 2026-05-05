import type { GameRecord } from './types';

export const PLAY_MANAGED_SESSION_ID = 'play-managed';

export function isPlayManagedGame(game: Pick<GameRecord, 'opencodeSessionId'>): boolean {
  return game.opencodeSessionId === PLAY_MANAGED_SESSION_ID;
}
