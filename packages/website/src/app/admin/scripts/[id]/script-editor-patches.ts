import type { ScriptDraft, NpcProfileDraft, SceneDraft } from './script-editor-types';
import { createNpcProfileDraft, createSceneDraft } from './script-editor-mappers';
import { toLineText } from './script-editor-helpers';

export type BasicPatch = {
  title?: string;
  summary?: string;
  setting?: string;
  difficulty?: string;
};

export type BackgroundPatch = {
  overview?: string;
  truth?: string;
  themes?: string[];
  factions?: string[];
  locations?: string[];
  secrets?: string[];
};

export type NpcPatchInput = {
  id?: string;
  name?: string;
  type?: string;
  role?: 'ally' | 'neutral' | 'enemy';
  threat?: string;
  summary?: string;
  useWhen?: string;
  status?: string;
  hp?: number | string;
  armor?: number | string;
  move?: number | string;
  traits?: string[];
  tactics?: string;
  weakness?: string;
  sanityLoss?: string;
};

export type ScenePatchInput = {
  id?: string;
  title?: string;
  summary?: string;
  location?: string;
  hooks?: string[];
};

export type OptionsPatch = {
  equipmentOptions?: string[];
  originOptions?: string[];
  buffOptions?: string[];
  debuffOptions?: string[];
};

export type ScriptPatch =
  | { kind: 'basic'; patch: BasicPatch }
  | { kind: 'background'; patch: BackgroundPatch }
  | { kind: 'npc'; patch: NpcPatchInput }
  | { kind: 'npc_remove'; id: string }
  | { kind: 'scene'; patch: ScenePatchInput }
  | { kind: 'scene_remove'; id: string }
  | { kind: 'options'; patch: OptionsPatch };

function numberLike(value: number | string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }
  return value;
}

function mergeNpc(current: NpcProfileDraft, patch: NpcPatchInput): NpcProfileDraft {
  return {
    ...current,
    name: patch.name ?? current.name,
    type: patch.type ?? current.type,
    role: patch.role ?? current.role,
    threat: patch.threat ?? current.threat,
    summary: patch.summary ?? current.summary,
    useWhen: patch.useWhen ?? current.useWhen,
    status: patch.status ?? current.status,
    hp: numberLike(patch.hp) ?? current.hp,
    armor: numberLike(patch.armor) ?? current.armor,
    move: numberLike(patch.move) ?? current.move,
    traitsText: patch.traits ? toLineText(patch.traits) : current.traitsText,
    tactics: patch.tactics ?? current.tactics,
    weakness: patch.weakness ?? current.weakness,
    sanityLoss: patch.sanityLoss ?? current.sanityLoss,
  };
}

function mergeScene(current: SceneDraft, patch: ScenePatchInput): SceneDraft {
  return {
    ...current,
    title: patch.title ?? current.title,
    summary: patch.summary ?? current.summary,
    location: patch.location ?? current.location,
    hooksText: patch.hooks ? toLineText(patch.hooks) : current.hooksText,
  };
}

export function applyScriptPatch(draft: ScriptDraft, patch: ScriptPatch): ScriptDraft {
  if (patch.kind === 'basic') {
    const { patch: p } = patch;
    return {
      ...draft,
      title: p.title ?? draft.title,
      summary: p.summary ?? draft.summary,
      setting: p.setting ?? draft.setting,
      difficulty: p.difficulty ?? draft.difficulty,
    };
  }

  if (patch.kind === 'background') {
    const { patch: p } = patch;
    return {
      ...draft,
      background: {
        ...draft.background,
        overview: p.overview ?? draft.background.overview,
        truth: p.truth ?? draft.background.truth,
        themesText: p.themes ? toLineText(p.themes) : draft.background.themesText,
        factionsText: p.factions ? toLineText(p.factions) : draft.background.factionsText,
        locationsText: p.locations ? toLineText(p.locations) : draft.background.locationsText,
        secretsText: p.secrets ? toLineText(p.secrets) : draft.background.secretsText,
      },
    };
  }

  if (patch.kind === 'npc') {
    const input = patch.patch;
    const targetId = input.id?.trim();
    if (targetId) {
      const exists = draft.npcProfiles.some((npc) => npc.id === targetId);
      if (exists) {
        return {
          ...draft,
          npcProfiles: draft.npcProfiles.map((npc) => (npc.id === targetId ? mergeNpc(npc, input) : npc)),
        };
      }
    }
    const base = createNpcProfileDraft();
    const created = mergeNpc({ ...base, id: targetId || base.id }, input);
    return { ...draft, npcProfiles: [...draft.npcProfiles, created] };
  }

  if (patch.kind === 'npc_remove') {
    return { ...draft, npcProfiles: draft.npcProfiles.filter((npc) => npc.id !== patch.id) };
  }

  if (patch.kind === 'scene') {
    const input = patch.patch;
    const targetId = input.id?.trim();
    if (targetId) {
      const exists = draft.scenes.some((scene) => scene.id === targetId);
      if (exists) {
        return {
          ...draft,
          scenes: draft.scenes.map((scene) => (scene.id === targetId ? mergeScene(scene, input) : scene)),
        };
      }
    }
    const base = createSceneDraft();
    const created = mergeScene({ ...base, id: targetId || base.id }, input);
    return { ...draft, scenes: [...draft.scenes, created] };
  }

  if (patch.kind === 'scene_remove') {
    return { ...draft, scenes: draft.scenes.filter((scene) => scene.id !== patch.id) };
  }

  if (patch.kind === 'options') {
    const { patch: p } = patch;
    return {
      ...draft,
      equipmentOptionsText: p.equipmentOptions ? toLineText(p.equipmentOptions) : draft.equipmentOptionsText,
      originOptionsText: p.originOptions ? toLineText(p.originOptions) : draft.originOptionsText,
      buffOptionsText: p.buffOptions ? toLineText(p.buffOptions) : draft.buffOptionsText,
      debuffOptionsText: p.debuffOptions ? toLineText(p.debuffOptions) : draft.debuffOptionsText,
    };
  }

  return draft;
}

export function describeScriptPatch(patch: ScriptPatch): string {
  switch (patch.kind) {
    case 'basic':
      return `更新基础信息（${Object.keys(patch.patch).join('、') || '无字段'}）`;
    case 'background':
      return `更新背景设定（${Object.keys(patch.patch).join('、') || '无字段'}）`;
    case 'npc':
      return patch.patch.id ? `更新 NPC「${patch.patch.name ?? patch.patch.id}」` : `新增 NPC「${patch.patch.name ?? '未命名'}」`;
    case 'npc_remove':
      return `移除 NPC（id=${patch.id}）`;
    case 'scene':
      return patch.patch.id ? `更新场景「${patch.patch.title ?? patch.patch.id}」` : `新增场景「${patch.patch.title ?? '未命名'}」`;
    case 'scene_remove':
      return `移除场景（id=${patch.id}）`;
    case 'options':
      return `更新选项列表（${Object.keys(patch.patch).join('、') || '无字段'}）`;
    default:
      return '未知修改';
  }
}
