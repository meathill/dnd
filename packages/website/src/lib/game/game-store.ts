import { create } from 'zustand';
import type { CharacterRecord, GameMemorySnapshot } from './types';

export type GamePhase = 'home' | 'script' | 'game';

export type GameStoreState = {
  phase: GamePhase;
  selectedScriptId: string | null;
  activeGameId: string | null;
  character: CharacterRecord | null;
  memory: GameMemorySnapshot | null;
  mapText: string | null;
};

export type GameStoreActions = {
  setPhase: (phase: GamePhase) => void;
  selectScript: (scriptId: string | null) => void;
  setActiveGameId: (gameId: string | null) => void;
  setCharacter: (character: CharacterRecord | null) => void;
  setMemory: (memory: GameMemorySnapshot | null) => void;
  setMapText: (mapText: string | null) => void;
  reset: () => void;
};

const initialState: GameStoreState = {
  phase: 'home',
  selectedScriptId: null,
  activeGameId: null,
  character: null,
  memory: null,
  mapText: null,
};

export const useGameStore = create<GameStoreState & GameStoreActions>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  selectScript: (scriptId) =>
    set((state) => {
      if (!scriptId) {
        return { selectedScriptId: null, activeGameId: null, character: null, memory: null, mapText: null };
      }
      const shouldResetCharacter = Boolean(state.character && state.character.scriptId !== scriptId);
      return {
        selectedScriptId: scriptId,
        ...(shouldResetCharacter ? { character: null, memory: null, mapText: null } : {}),
      };
    }),
  setActiveGameId: (gameId) => set({ activeGameId: gameId }),
  setCharacter: (character) => set({ character }),
  setMemory: (memory) => set({ memory }),
  setMapText: (mapText) => set({ mapText }),
  reset: () => set({ ...initialState }),
}));

export function resetGameStore() {
  useGameStore.setState({ ...initialState });
}
