import type {
  GameMemoryFlag,
  GameMemoryLocation,
  GameMemoryNpc,
  GameMemoryPresence,
  GameMemoryRoundSummary,
  GameMemorySnapshot,
  GameMemoryState,
  GameMemoryThread,
  GameMemoryVitals,
} from './types';

export type GameMemoryDelta = {
  inventoryAdd: string[];
  inventoryRemove: string[];
  buffsAdd: string[];
  buffsRemove: string[];
  debuffsAdd: string[];
  debuffsRemove: string[];
  alliesAdd: string[];
  alliesRemove: string[];
  npcs: GameMemoryNpc[];
  locations: GameMemoryLocation[];
  threads: GameMemoryThread[];
  flags: GameMemoryFlag[];
  notesAdd: string[];
  dmNotesAdd: string[];
  vitals: {
    hpCurrent?: number;
    hpMax?: number;
    sanityCurrent?: number;
    sanityMax?: number;
    magicCurrent?: number;
    magicMax?: number;
  };
  presence: {
    location?: string;
    scene?: string;
    presentNpcsAdd: string[];
    presentNpcsRemove: string[];
  };
  mapText?: string;
};

const EMPTY_STATE: GameMemoryState = {
  allies: [],
  npcs: [],
  locations: [],
  threads: [],
  flags: [],
  notes: [],
  dmNotes: [],
  vitals: {},
  presence: { presentNpcs: [] },
  mapText: '',
};

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const unique = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed) {
      continue;
    }
    unique.add(trimmed);
  }
  return Array.from(unique);
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return Math.floor(numeric);
    }
  }
  return null;
}

function normalizeRoundSummary(entry: unknown): GameMemoryRoundSummary | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const round = typeof record.round === 'number' ? Math.floor(record.round) : Number(record.round ?? 0);
  if (!Number.isFinite(round) || round <= 0) {
    return null;
  }
  const summary = typeof record.summary === 'string' ? record.summary.trim() : '';
  if (!summary) {
    return null;
  }
  return { round, summary };
}

function normalizeNpc(entry: unknown): GameMemoryNpc | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    return null;
  }
  return {
    name,
    status: typeof record.status === 'string' ? record.status.trim() : '',
    relation: typeof record.relation === 'string' ? record.relation.trim() : undefined,
    location: typeof record.location === 'string' ? record.location.trim() : undefined,
    notes: typeof record.notes === 'string' ? record.notes.trim() : undefined,
    isAlly: typeof record.isAlly === 'boolean' ? record.isAlly : undefined,
  };
}

function normalizeLocation(entry: unknown): GameMemoryLocation | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  if (!name) {
    return null;
  }
  return {
    name,
    status: typeof record.status === 'string' ? record.status.trim() : '',
    notes: typeof record.notes === 'string' ? record.notes.trim() : undefined,
  };
}

function normalizeThread(entry: unknown): GameMemoryThread | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title.trim() : '';
  if (!title) {
    return null;
  }
  const status = record.status === 'resolved' || record.status === 'blocked' ? record.status : 'open';
  return {
    title,
    status,
    notes: typeof record.notes === 'string' ? record.notes.trim() : undefined,
  };
}

function normalizeFlag(entry: unknown): GameMemoryFlag | null {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const record = entry as Record<string, unknown>;
  const key = typeof record.key === 'string' ? record.key.trim() : '';
  const value = typeof record.value === 'string' ? record.value.trim() : '';
  if (!key || !value) {
    return null;
  }
  return { key, value };
}

function normalizeVitalPair(
  raw: unknown,
  currentFallback: unknown,
  maxFallback: unknown,
): { current: number; max: number } | null {
  let current: number | null = null;
  let max: number | null = null;
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    current = normalizeNumber(record.current);
    max = normalizeNumber(record.max);
  }
  if (current === null) {
    current = normalizeNumber(currentFallback);
  }
  if (max === null) {
    max = normalizeNumber(maxFallback);
  }
  if (current === null && max === null) {
    return null;
  }
  const safeCurrent = current ?? max ?? 0;
  const safeMax = max ?? current ?? safeCurrent;
  const clampedCurrent = Math.max(0, safeCurrent);
  const clampedMax = Math.max(clampedCurrent, Math.max(0, safeMax));
  return { current: clampedCurrent, max: clampedMax };
}

function normalizeVitalsState(raw: unknown): GameMemoryVitals {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const record = raw as Record<string, unknown>;
  const hp = normalizeVitalPair(record.hp, record.hpCurrent, record.hpMax);
  const sanity = normalizeVitalPair(record.sanity, record.sanityCurrent, record.sanityMax);
  const magic = normalizeVitalPair(record.magic, record.magicCurrent, record.magicMax);
  const result: GameMemoryVitals = {};
  if (hp) {
    result.hp = hp;
  }
  if (sanity) {
    result.sanity = sanity;
  }
  if (magic) {
    result.magic = magic;
  }
  return result;
}

function normalizePresenceState(raw: unknown): GameMemoryPresence {
  if (!raw || typeof raw !== 'object') {
    return { presentNpcs: [] };
  }
  const record = raw as Record<string, unknown>;
  const location = typeof record.location === 'string' ? record.location.trim() : '';
  const scene = typeof record.scene === 'string' ? record.scene.trim() : '';
  const presentNpcs = normalizeStringList(record.presentNpcs ?? record.npcsPresent ?? []);
  return {
    presentNpcs,
    ...(location ? { location } : {}),
    ...(scene ? { scene } : {}),
  };
}

function mergeUniqueList(base: string[], add: string[], remove: string[]): string[] {
  const set = new Set(base);
  add.forEach((item) => set.add(item));
  remove.forEach((item) => set.delete(item));
  return Array.from(set);
}

function mergeByName<T extends { name: string }>(base: T[], updates: T[]): T[] {
  const map = new Map<string, T>();
  base.forEach((item) => {
    map.set(item.name, { ...item });
  });
  updates.forEach((item) => {
    const existing = map.get(item.name);
    map.set(item.name, existing ? { ...existing, ...item } : { ...item });
  });
  return Array.from(map.values());
}

function mergeByTitle(base: GameMemoryThread[], updates: GameMemoryThread[]): GameMemoryThread[] {
  const map = new Map<string, GameMemoryThread>();
  base.forEach((item) => {
    map.set(item.title, { ...item });
  });
  updates.forEach((item) => {
    const existing = map.get(item.title);
    map.set(item.title, existing ? { ...existing, ...item } : { ...item });
  });
  return Array.from(map.values());
}

function mergeFlags(base: GameMemoryFlag[], updates: GameMemoryFlag[]): GameMemoryFlag[] {
  const map = new Map<string, GameMemoryFlag>();
  base.forEach((item) => {
    map.set(item.key, { ...item });
  });
  updates.forEach((item) => {
    map.set(item.key, { ...item });
  });
  return Array.from(map.values());
}

export function createEmptyMemoryState(): GameMemoryState {
  return {
    allies: [],
    npcs: [],
    locations: [],
    threads: [],
    flags: [],
    notes: [],
    dmNotes: [],
    vitals: {},
    presence: { presentNpcs: [] },
    mapText: '',
  };
}

export function normalizeMemoryDelta(raw: unknown): GameMemoryDelta {
  if (!raw || typeof raw !== 'object') {
    return {
      inventoryAdd: [],
      inventoryRemove: [],
      buffsAdd: [],
      buffsRemove: [],
      debuffsAdd: [],
      debuffsRemove: [],
      alliesAdd: [],
      alliesRemove: [],
      npcs: [],
      locations: [],
      threads: [],
      flags: [],
      notesAdd: [],
      dmNotesAdd: [],
      vitals: {},
      presence: {
        presentNpcsAdd: [],
        presentNpcsRemove: [],
      },
    };
  }
  const record = raw as Record<string, unknown>;
  const npcs = Array.isArray(record.npcs) ? record.npcs.map(normalizeNpc).filter(Boolean) : [];
  const locations = Array.isArray(record.locations) ? record.locations.map(normalizeLocation).filter(Boolean) : [];
  const threads = Array.isArray(record.threads) ? record.threads.map(normalizeThread).filter(Boolean) : [];
  const flags = Array.isArray(record.flags) ? record.flags.map(normalizeFlag).filter(Boolean) : [];
  const vitalsRaw =
    typeof record.vitals === 'object' && record.vitals !== null ? (record.vitals as Record<string, unknown>) : {};
  const presenceRaw =
    typeof record.presence === 'object' && record.presence !== null ? (record.presence as Record<string, unknown>) : {};
  const mapText = typeof record.mapText === 'string' ? record.mapText.trim() : '';
  const hpCurrent = normalizeNumber(vitalsRaw.hpCurrent);
  const hpMax = normalizeNumber(vitalsRaw.hpMax);
  const sanityCurrent = normalizeNumber(vitalsRaw.sanityCurrent);
  const sanityMax = normalizeNumber(vitalsRaw.sanityMax);
  const magicCurrent = normalizeNumber(vitalsRaw.magicCurrent);
  const magicMax = normalizeNumber(vitalsRaw.magicMax);
  const presenceLocation = typeof presenceRaw.location === 'string' ? presenceRaw.location.trim() : '';
  const presenceScene = typeof presenceRaw.scene === 'string' ? presenceRaw.scene.trim() : '';
  return {
    inventoryAdd: normalizeStringList(record.inventoryAdd),
    inventoryRemove: normalizeStringList(record.inventoryRemove),
    buffsAdd: normalizeStringList(record.buffsAdd),
    buffsRemove: normalizeStringList(record.buffsRemove),
    debuffsAdd: normalizeStringList(record.debuffsAdd),
    debuffsRemove: normalizeStringList(record.debuffsRemove),
    alliesAdd: normalizeStringList(record.alliesAdd),
    alliesRemove: normalizeStringList(record.alliesRemove),
    npcs: npcs as GameMemoryNpc[],
    locations: locations as GameMemoryLocation[],
    threads: threads as GameMemoryThread[],
    flags: flags as GameMemoryFlag[],
    notesAdd: normalizeStringList(record.notesAdd),
    dmNotesAdd: normalizeStringList(record.dmNotesAdd),
    vitals: {
      hpCurrent: hpCurrent ?? undefined,
      hpMax: hpMax ?? undefined,
      sanityCurrent: sanityCurrent ?? undefined,
      sanityMax: sanityMax ?? undefined,
      magicCurrent: magicCurrent ?? undefined,
      magicMax: magicMax ?? undefined,
    },
    presence: {
      location: presenceLocation || undefined,
      scene: presenceScene || undefined,
      presentNpcsAdd: normalizeStringList(presenceRaw.presentNpcsAdd),
      presentNpcsRemove: normalizeStringList(presenceRaw.presentNpcsRemove),
    },
    mapText: mapText || undefined,
  };
}

function applyVitalUpdate(
  current: { current: number; max: number } | undefined,
  update: { current?: number; max?: number },
): { current: number; max: number } | undefined {
  if (update.current === undefined && update.max === undefined) {
    return current ? { ...current } : undefined;
  }
  const baseCurrent = update.current ?? current?.current ?? update.max ?? current?.max ?? 0;
  const baseMax = update.max ?? current?.max ?? baseCurrent;
  const normalizedCurrent = Math.max(0, Math.floor(baseCurrent));
  const normalizedMax = Math.max(normalizedCurrent, Math.floor(baseMax));
  return { current: normalizedCurrent, max: normalizedMax };
}

export function applyMemoryDelta(state: GameMemoryState, delta: GameMemoryDelta): GameMemoryState {
  const nextVitals: GameMemoryVitals = {
    ...state.vitals,
  };
  const hpUpdate = applyVitalUpdate(state.vitals.hp, { current: delta.vitals.hpCurrent, max: delta.vitals.hpMax });
  const sanityUpdate = applyVitalUpdate(state.vitals.sanity, {
    current: delta.vitals.sanityCurrent,
    max: delta.vitals.sanityMax,
  });
  const magicUpdate = applyVitalUpdate(state.vitals.magic, {
    current: delta.vitals.magicCurrent,
    max: delta.vitals.magicMax,
  });
  if (hpUpdate) {
    nextVitals.hp = hpUpdate;
  }
  if (sanityUpdate) {
    nextVitals.sanity = sanityUpdate;
  }
  if (magicUpdate) {
    nextVitals.magic = magicUpdate;
  }

  const presenceLocation = delta.presence.location?.trim() || state.presence.location;
  const presenceScene = delta.presence.scene?.trim() || state.presence.scene;
  const presentNpcs = mergeUniqueList(
    state.presence.presentNpcs,
    delta.presence.presentNpcsAdd,
    delta.presence.presentNpcsRemove,
  );
  const nextMapText = typeof delta.mapText === 'string' && delta.mapText.trim() ? delta.mapText.trim() : state.mapText;

  return {
    allies: mergeUniqueList(state.allies, delta.alliesAdd, delta.alliesRemove),
    npcs: mergeByName(state.npcs, delta.npcs),
    locations: mergeByName(state.locations, delta.locations),
    threads: mergeByTitle(state.threads, delta.threads),
    flags: mergeFlags(state.flags, delta.flags),
    notes: mergeUniqueList(state.notes, delta.notesAdd, []),
    dmNotes: mergeUniqueList(state.dmNotes, delta.dmNotesAdd, []),
    vitals: nextVitals,
    presence: {
      presentNpcs,
      ...(presenceLocation ? { location: presenceLocation } : {}),
      ...(presenceScene ? { scene: presenceScene } : {}),
    },
    mapText: nextMapText,
  };
}

export function parseMemoryState(raw: string): GameMemoryState {
  if (!raw) {
    return createEmptyMemoryState();
  }
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    return {
      allies: normalizeStringList(data.allies),
      npcs: Array.isArray(data.npcs)
        ? data.npcs.map(normalizeNpc).filter((item): item is GameMemoryNpc => Boolean(item))
        : [],
      locations: Array.isArray(data.locations)
        ? data.locations.map(normalizeLocation).filter((item): item is GameMemoryLocation => Boolean(item))
        : [],
      threads: Array.isArray(data.threads)
        ? data.threads.map(normalizeThread).filter((item): item is GameMemoryThread => Boolean(item))
        : [],
      flags: Array.isArray(data.flags)
        ? data.flags.map(normalizeFlag).filter((item): item is GameMemoryFlag => Boolean(item))
        : [],
      notes: normalizeStringList(data.notes),
      dmNotes: normalizeStringList(data.dmNotes),
      vitals: normalizeVitalsState(data.vitals),
      presence: normalizePresenceState(data.presence),
      mapText: typeof data.mapText === 'string' ? data.mapText.trim() : '',
    };
  } catch {
    return createEmptyMemoryState();
  }
}

export function parseRoundSummaries(raw: string): GameMemoryRoundSummary[] {
  if (!raw) {
    return [];
  }
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(normalizeRoundSummary).filter(Boolean) as GameMemoryRoundSummary[];
  } catch {
    return [];
  }
}

export function buildShortSummary(longSummary: string, recentRounds: GameMemoryRoundSummary[], keepRecent = 3): string {
  const parts: string[] = [];
  const trimmedLong = longSummary.trim();
  if (trimmedLong) {
    parts.push(trimmedLong);
  }
  const cutoff = Math.max(0, recentRounds.length - keepRecent);
  const condensed = recentRounds.slice(0, cutoff).map((item) => `回合 ${item.round}：${item.summary}`);
  if (condensed.length > 0) {
    parts.push(condensed.join('\n'));
  }
  return parts.join('\n').trim();
}

export function formatMemoryState(state: GameMemoryState): string {
  const sections: string[] = [];
  if (state.vitals.hp || state.vitals.sanity || state.vitals.magic) {
    const vitals: string[] = [];
    if (state.vitals.hp) {
      vitals.push(`生命 ${state.vitals.hp.current}/${state.vitals.hp.max}`);
    }
    if (state.vitals.sanity) {
      vitals.push(`理智 ${state.vitals.sanity.current}/${state.vitals.sanity.max}`);
    }
    if (state.vitals.magic) {
      vitals.push(`魔法 ${state.vitals.magic.current}/${state.vitals.magic.max}`);
    }
    if (vitals.length > 0) {
      sections.push(`角色状态：${vitals.join('，')}`);
    }
  }
  if (state.presence.location || state.presence.scene || state.presence.presentNpcs.length > 0) {
    const presenceParts: string[] = [];
    if (state.presence.location) {
      presenceParts.push(`地点:${state.presence.location}`);
    }
    if (state.presence.scene) {
      presenceParts.push(`场景:${state.presence.scene}`);
    }
    if (state.presence.presentNpcs.length > 0) {
      presenceParts.push(`在场 NPC:${state.presence.presentNpcs.join('、')}`);
    }
    if (presenceParts.length > 0) {
      sections.push(`当前环境：${presenceParts.join('，')}`);
    }
  }
  if (state.allies.length > 0) {
    sections.push(`盟友：${state.allies.join('、')}`);
  }
  if (state.npcs.length > 0) {
    const npcLines = state.npcs
      .map((npc) => {
        const parts = [npc.name];
        if (npc.status) {
          parts.push(npc.status);
        }
        if (npc.relation) {
          parts.push(`关系:${npc.relation}`);
        }
        if (npc.location) {
          parts.push(`位置:${npc.location}`);
        }
        if (npc.notes) {
          parts.push(`备注:${npc.notes}`);
        }
        return parts.join(' | ');
      })
      .join('；');
    sections.push(`NPC：${npcLines}`);
  }
  if (state.locations.length > 0) {
    const locationLines = state.locations
      .map((location) => `${location.name}${location.status ? `(${location.status})` : ''}`)
      .join('、');
    sections.push(`地点：${locationLines}`);
  }
  if (state.threads.length > 0) {
    const threadLines = state.threads
      .map((thread) => `${thread.title}${thread.status !== 'open' ? `(${thread.status})` : ''}`)
      .join('、');
    sections.push(`线索/任务：${threadLines}`);
  }
  if (state.flags.length > 0) {
    const flagLines = state.flags.map((flag) => `${flag.key}:${flag.value}`).join('、');
    sections.push(`关键标记：${flagLines}`);
  }
  if (state.notes.length > 0) {
    sections.push(`记录：${state.notes.join('、')}`);
  }
  if (state.dmNotes.length > 0) {
    sections.push(`DM 笔记：${state.dmNotes.join('、')}`);
  }
  if (state.mapText && state.mapText.trim()) {
    sections.push('地图：已记录（ASCII/emoji）');
  }
  return sections.length > 0 ? sections.join('\n') : '无';
}

export function buildMemoryContext(summary: string, state: GameMemoryState): string {
  const parts: string[] = [];
  if (summary.trim()) {
    parts.push(`历史摘要：${summary.trim()}`);
  }
  const stateText = formatMemoryState(state);
  if (stateText && stateText !== '无') {
    parts.push(`世界状态：${stateText}`);
  }
  return parts.length > 0 ? parts.join('\n') : '无';
}

export function normalizeRoundSummaries(input: unknown): GameMemoryRoundSummary[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.map(normalizeRoundSummary).filter(Boolean) as GameMemoryRoundSummary[];
}

export function createFallbackSummaries(
  rounds: Array<{ round: number; playerText: string; dmText: string }>,
): GameMemoryRoundSummary[] {
  return rounds
    .map((round) => {
      const raw = round.dmText || round.playerText;
      const summary = raw.replace(/\s+/g, ' ').trim().slice(0, 140);
      if (!summary) {
        return null;
      }
      return { round: round.round, summary };
    })
    .filter(Boolean) as GameMemoryRoundSummary[];
}

export function createEmptyMemoryDelta(): GameMemoryDelta {
  return {
    inventoryAdd: [],
    inventoryRemove: [],
    buffsAdd: [],
    buffsRemove: [],
    debuffsAdd: [],
    debuffsRemove: [],
    alliesAdd: [],
    alliesRemove: [],
    npcs: [],
    locations: [],
    threads: [],
    flags: [],
    notesAdd: [],
    dmNotesAdd: [],
    vitals: {},
    presence: {
      presentNpcsAdd: [],
      presentNpcsRemove: [],
    },
    mapText: undefined,
  };
}

export function buildMemorySnapshot(state: GameMemoryState): GameMemorySnapshot {
  return {
    vitals: state.vitals,
    presence: state.presence,
    mapText: state.mapText,
    locations: state.locations,
  };
}
