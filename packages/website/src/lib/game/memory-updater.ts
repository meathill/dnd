import type { AiProvider } from '../ai/ai-types';
import type { CharacterRecord, GameMemoryRecord, ScriptDefinition } from './types';
import {
  applyMemoryDelta,
  buildShortSummary,
  createEmptyMemoryDelta,
  createEmptyMemoryState,
  formatMemoryState,
} from './memory';
import { mergeLongSummary, summarizeRounds, type MemoryRoundInput } from './memory-compressor';
import {
  createGameMemoryMap,
  getGameMemory,
  listGameMessagesAfter,
  upsertGameMemory,
  updateCharacterState,
} from '../db/repositories';

const MAX_RECENT_ROUNDS = 20;
const KEEP_RAW_ROUNDS = 3;
const CHUNK_SIZE = 4;

function buildBaseVitals(character: CharacterRecord) {
  const constitution = character.attributes.constitution ?? 0;
  const size = character.attributes.size ?? 0;
  const willpower = character.attributes.willpower ?? 0;
  const hitPoints = Math.max(1, Math.floor((constitution + size) / 10));
  const sanity = Math.max(0, Math.floor(willpower));
  const magic = Math.max(0, Math.floor(willpower / 5));
  return {
    hp: { current: hitPoints, max: hitPoints },
    sanity: { current: sanity, max: sanity },
    magic: { current: magic, max: magic },
  };
}

function ensureVitalPair(
  current: { current: number; max: number } | undefined,
  fallback: { current: number; max: number },
) {
  if (!current) {
    return { ...fallback };
  }
  const currentValue = Number.isFinite(current.current) ? current.current : fallback.current;
  const maxValue = Number.isFinite(current.max) ? current.max : fallback.max;
  const normalizedMax = Math.max(maxValue, currentValue);
  const normalizedCurrent = Math.min(currentValue, normalizedMax);
  return { current: normalizedCurrent, max: normalizedMax };
}

function ensureVitalsState(state: GameMemoryRecord['state'], character: CharacterRecord) {
  const base = buildBaseVitals(character);
  return {
    ...state,
    vitals: {
      ...state.vitals,
      hp: ensureVitalPair(state.vitals.hp, base.hp),
      sanity: ensureVitalPair(state.vitals.sanity, base.sanity),
      magic: ensureVitalPair(state.vitals.magic, base.magic),
    },
    presence: {
      presentNpcs: Array.isArray(state.presence.presentNpcs) ? state.presence.presentNpcs : [],
      ...(state.presence.location ? { location: state.presence.location } : {}),
      ...(state.presence.scene ? { scene: state.presence.scene } : {}),
    },
  };
}

type RoundBucket = {
  round: number;
  playerText: string;
  dmText: string;
  lastMessageAt: string;
};

type MemoryRefreshResult = {
  memory: GameMemoryRecord;
  character: CharacterRecord;
};

function buildMessageText(message: { content: string; modules: Array<{ type: string; content?: string }> }): string {
  const narrative = message.modules.find((module) => module.type === 'narrative');
  if (narrative && typeof narrative.content === 'string') {
    return narrative.content;
  }
  const notice = message.modules.find((module) => module.type === 'notice');
  if (notice && typeof notice.content === 'string') {
    return notice.content;
  }
  return message.content;
}

function buildRounds(
  messages: Array<{
    role: string;
    content: string;
    modules: Array<{ type: string; content?: string }>;
    createdAt: string;
  }>,
  startIndex: number,
) {
  let roundIndex = startIndex;
  let lastCompletedRound = startIndex;
  let current: RoundBucket | null = null;
  const rounds: RoundBucket[] = [];
  let lastProcessedAt = '';
  let hasPendingPlayer = false;

  for (const message of messages) {
    if (message.role === 'player') {
      if (current && current.dmText.trim()) {
        rounds.push(current);
        lastProcessedAt = current.lastMessageAt;
        lastCompletedRound = current.round;
      }
      roundIndex += 1;
      current = {
        round: roundIndex,
        playerText: message.content,
        dmText: '',
        lastMessageAt: message.createdAt,
      };
      hasPendingPlayer = true;
      continue;
    }
    if (message.role === 'dm') {
      if (!current) {
        continue;
      }
      const text = buildMessageText(message);
      current.dmText = current.dmText ? `${current.dmText}\n${text}` : text;
      current.lastMessageAt = message.createdAt;
      hasPendingPlayer = false;
      continue;
    }
  }

  if (current && current.dmText.trim()) {
    rounds.push(current);
    lastProcessedAt = current.lastMessageAt;
    lastCompletedRound = current.round;
  }

  if (!lastProcessedAt && !hasPendingPlayer && messages.length > 0) {
    lastProcessedAt = messages[messages.length - 1]?.createdAt ?? '';
  }

  return { rounds, lastProcessedAt, lastCompletedRound };
}

function extractLatestMapText(
  messages: Array<{ role: string; modules: Array<{ type: string; content?: string }> }>,
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== 'dm') {
      continue;
    }
    const mapModule = message.modules.find((module) => module.type === 'map');
    if (mapModule && typeof mapModule.content === 'string') {
      const cleaned = mapModule.content.trim();
      if (cleaned) {
        return cleaned;
      }
    }
  }
  return null;
}

async function recordMapVersion(params: { db: D1Database; gameId: string; roundIndex: number; mapText: string }) {
  try {
    await createGameMemoryMap(params.db, {
      id: crypto.randomUUID(),
      gameId: params.gameId,
      roundIndex: params.roundIndex,
      content: params.mapText,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[memory-updater] 地图版本记录失败', error);
  }
}

function chunkRounds(rounds: RoundBucket[]): RoundBucket[][] {
  const chunks: RoundBucket[][] = [];
  for (let index = 0; index < rounds.length; index += CHUNK_SIZE) {
    chunks.push(rounds.slice(index, index + CHUNK_SIZE));
  }
  return chunks;
}

function applyListDelta(base: string[], add: string[], remove: string[]): string[] {
  const set = new Set(base);
  add.forEach((item) => set.add(item));
  remove.forEach((item) => set.delete(item));
  return Array.from(set);
}

function buildRoundInputs(rounds: RoundBucket[]): MemoryRoundInput[] {
  return rounds.map((round) => ({
    round: round.round,
    playerText: round.playerText,
    dmText: round.dmText,
  }));
}

function mergeRoundSummaries(
  base: Array<{ round: number; summary: string }>,
  updates: Array<{ round: number; summary: string }>,
) {
  const map = new Map<number, { round: number; summary: string }>();
  base.forEach((item) => map.set(item.round, item));
  updates.forEach((item) => map.set(item.round, item));
  return Array.from(map.values()).sort((a, b) => a.round - b.round);
}

export async function refreshGameMemory({
  db,
  provider,
  model,
  gameId,
  script,
  character,
}: {
  db: D1Database;
  provider: AiProvider;
  model: string;
  gameId: string;
  script: ScriptDefinition;
  character: CharacterRecord;
}): Promise<MemoryRefreshResult> {
  const memory = await getGameMemory(db, gameId);
  let baseMemory: GameMemoryRecord =
    memory ??
    ({
      id: crypto.randomUUID(),
      gameId,
      lastRoundIndex: 0,
      lastProcessedAt: '',
      shortSummary: '',
      longSummary: '',
      recentRounds: [],
      state: createEmptyMemoryState(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as GameMemoryRecord);
  baseMemory = {
    ...baseMemory,
    state: ensureVitalsState(baseMemory.state, character),
  };

  const messages = await listGameMessagesAfter(db, gameId, baseMemory.lastProcessedAt);
  if (messages.length === 0) {
    if (!memory) {
      const created = await upsertGameMemory(db, baseMemory);
      return { memory: created, character };
    }
    return { memory: baseMemory, character };
  }

  const latestMapText = extractLatestMapText(messages);
  const mapUpdated = Boolean(latestMapText && latestMapText !== baseMemory.state.mapText);
  const { rounds, lastProcessedAt, lastCompletedRound } = buildRounds(messages, baseMemory.lastRoundIndex);
  if (rounds.length === 0) {
    if (mapUpdated && latestMapText) {
      await recordMapVersion({ db, gameId, roundIndex: lastCompletedRound, mapText: latestMapText });
    }
    if ((!lastProcessedAt || lastProcessedAt === baseMemory.lastProcessedAt) && !mapUpdated) {
      return { memory: baseMemory, character };
    }
    const nextState = mapUpdated
      ? { ...baseMemory.state, mapText: latestMapText ?? baseMemory.state.mapText }
      : baseMemory.state;
    const updated = await upsertGameMemory(db, {
      ...baseMemory,
      lastProcessedAt,
      state: nextState,
      updatedAt: new Date().toISOString(),
    });
    return { memory: updated, character };
  }

  if (mapUpdated && latestMapText) {
    await recordMapVersion({ db, gameId, roundIndex: lastCompletedRound, mapText: latestMapText });
  }

  let workingState = mapUpdated
    ? { ...baseMemory.state, mapText: latestMapText ?? baseMemory.state.mapText }
    : baseMemory.state;
  let workingCharacter = character;
  let recentRounds = [...baseMemory.recentRounds];
  let longSummary = baseMemory.longSummary;

  const roundChunks = chunkRounds(rounds);
  for (const chunk of roundChunks) {
    const summaryResult = await summarizeRounds({
      provider,
      model,
      script,
      character: workingCharacter,
      memorySummary: baseMemory.shortSummary,
      memoryStateText: formatMemoryState(workingState),
      rounds: buildRoundInputs(chunk),
    });

    const delta = summaryResult.stateDelta ?? createEmptyMemoryDelta();
    workingState = applyMemoryDelta(workingState, delta);
    const nextInventory = applyListDelta(workingCharacter.inventory, delta.inventoryAdd, delta.inventoryRemove);
    const nextBuffs = applyListDelta(workingCharacter.buffs, delta.buffsAdd, delta.buffsRemove);
    const nextDebuffs = applyListDelta(workingCharacter.debuffs, delta.debuffsAdd, delta.debuffsRemove);
    if (
      nextInventory.join('|') !== workingCharacter.inventory.join('|') ||
      nextBuffs.join('|') !== workingCharacter.buffs.join('|') ||
      nextDebuffs.join('|') !== workingCharacter.debuffs.join('|')
    ) {
      const updatedCharacter = await updateCharacterState(db, workingCharacter.id, {
        inventory: nextInventory,
        buffs: nextBuffs,
        debuffs: nextDebuffs,
      });
      if (updatedCharacter) {
        workingCharacter = updatedCharacter;
      }
    }

    const normalizedSummaries = summaryResult.roundSummaries;
    if (normalizedSummaries.length > 0) {
      recentRounds = mergeRoundSummaries(recentRounds, normalizedSummaries);
    }
  }

  let overflow: typeof recentRounds = [];
  if (recentRounds.length > MAX_RECENT_ROUNDS) {
    overflow = recentRounds.slice(0, recentRounds.length - MAX_RECENT_ROUNDS);
    recentRounds = recentRounds.slice(-MAX_RECENT_ROUNDS);
  }

  if (overflow.length > 0) {
    longSummary = await mergeLongSummary({ provider, model, longSummary, overflowSummaries: overflow });
  }

  const shortSummary = buildShortSummary(longSummary, recentRounds, KEEP_RAW_ROUNDS);
  const updatedAt = new Date().toISOString();
  const updatedMemory = await upsertGameMemory(db, {
    ...baseMemory,
    lastRoundIndex: lastCompletedRound,
    lastProcessedAt: lastProcessedAt || baseMemory.lastProcessedAt,
    shortSummary,
    longSummary,
    recentRounds,
    state: workingState,
    updatedAt,
  });

  return { memory: updatedMemory, character: workingCharacter };
}
