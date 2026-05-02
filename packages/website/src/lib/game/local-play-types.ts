import type { FormState } from '@/app/character-creator-data';
import { buildScriptDraft } from '@/app/admin/scripts/[id]/script-editor-mappers';
import type { CharacterRecord, ChatMessage, GameMemorySnapshot } from './types';
import type { CocModulePlayabilityReport } from './rulebook';

export type LocalPlayStorage = {
  draft: ReturnType<typeof buildScriptDraft>;
  character: CharacterRecord | null;
  characterForm?: FormState | null;
  messages: ChatMessage[];
  memory: GameMemorySnapshot | null;
  updatedAt: string;
};

export type LocalPlaySendResult = {
  messages: ChatMessage[];
  memory: GameMemorySnapshot;
};

export type LocalPlayReport = {
  playability: CocModulePlayabilityReport;
  encounterRisks: Array<{
    encounterId: string;
    title: string;
    overallRisk: string;
    warnings: string[];
    suggestions: string[];
  }>;
};
