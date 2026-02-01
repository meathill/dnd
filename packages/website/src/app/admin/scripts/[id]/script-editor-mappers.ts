import type {
  AttributeKey,
  ScriptDefinition,
  ScriptEncounter,
  ScriptScene,
  ScriptStoryArc,
  ScriptNpcProfile,
  ScriptRuleOverrides,
} from '@/lib/game/types';
import {
  ATTRIBUTE_KEYS,
  type ScriptDraft,
  type OpeningMessageDraft,
  type StoryArcDraft,
  type SceneDraft,
  type EncounterDraft,
  type NpcProfileDraft,
} from './script-editor-types';
import {
  createId,
  ensureId,
  formatNpcAttacks,
  formatNpcSkills,
  formatNumberMap,
  formatSkillOptions,
  numberToText,
  parseNpcAttacks,
  parseNpcSkills,
  parseLineText,
  parseNumberList,
  parseNumberMap,
  parseNumberOptional,
  parseNumberValue,
  parseSkillOptions,
  toLineText,
} from './script-editor-helpers';

export function buildScriptDraft(script: ScriptDefinition): ScriptDraft {
  const ranges: ScriptDraft['attributeRanges'] = {
    strength: { min: '', max: '' },
    dexterity: { min: '', max: '' },
    constitution: { min: '', max: '' },
    size: { min: '', max: '' },
    intelligence: { min: '', max: '' },
    willpower: { min: '', max: '' },
    appearance: { min: '', max: '' },
    education: { min: '', max: '' },
  };

  ATTRIBUTE_KEYS.forEach((key) => {
    const range = script.attributeRanges[key];
    if (range) {
      ranges[key] = {
        min: numberToText(range.min),
        max: numberToText(range.max),
      };
    }
  });

  return {
    id: script.id,
    title: script.title,
    summary: script.summary,
    setting: script.setting,
    difficulty: script.difficulty,
    openingMessages: script.openingMessages,
    background: {
      overview: script.background.overview,
      truth: script.background.truth,
      themesText: toLineText(script.background.themes),
      factionsText: toLineText(script.background.factions),
      locationsText: toLineText(script.background.locations),
      secretsText: toLineText(script.background.secrets),
    },
    storyArcs: script.storyArcs.map((arc) => ({
      id: arc.id,
      title: arc.title,
      summary: arc.summary,
      beatsText: toLineText(arc.beats),
      revealsText: toLineText(arc.reveals),
    })),
    npcProfiles: script.npcProfiles.map((npc) => ({
      id: npc.id,
      name: npc.name,
      type: npc.type,
      role: npc.role ?? 'neutral',
      threat: npc.threat,
      summary: npc.summary,
      useWhen: npc.useWhen ?? '',
      status: npc.status ?? '',
      hp: numberToText(npc.hp),
      armor: numberToText(npc.armor),
      move: numberToText(npc.move),
      attacksText: formatNpcAttacks(npc.attacks),
      skillsText: formatNpcSkills(npc.skills),
      traitsText: toLineText(npc.traits),
      tactics: npc.tactics,
      weakness: npc.weakness,
      sanityLoss: npc.sanityLoss,
    })),
    skillOptionsText: formatSkillOptions(script.skillOptions),
    equipmentOptionsText: toLineText(script.equipmentOptions),
    occupationOptionsText: toLineText(script.occupationOptions),
    originOptionsText: toLineText(script.originOptions),
    buffOptionsText: toLineText(script.buffOptions),
    debuffOptionsText: toLineText(script.debuffOptions),
    attributeRanges: ranges,
    attributePointBudget: numberToText(script.attributePointBudget),
    skillLimit: numberToText(script.skillLimit),
    equipmentLimit: numberToText(script.equipmentLimit),
    buffLimit: numberToText(script.buffLimit),
    debuffLimit: numberToText(script.debuffLimit),
    rules: {
      defaultCheckDc: numberToText(script.rules.defaultCheckDc),
      checkDcOverridesText: formatNumberMap(script.rules.checkDcOverrides),
      skillValueTrained: numberToText(script.rules.skillValueTrained),
      skillValueUntrained: numberToText(script.rules.skillValueUntrained),
      skillPointBudget: numberToText(script.rules.skillPointBudget),
      skillMaxValue: numberToText(script.rules.skillMaxValue),
      skillBaseValuesText: formatNumberMap(script.rules.skillBaseValues),
      skillAllocationMode: script.rules.skillAllocationMode ?? '',
      quickstartCoreValuesText: script.rules.quickstartCoreValues ? script.rules.quickstartCoreValues.join('\n') : '',
      quickstartInterestCount: numberToText(script.rules.quickstartInterestCount),
      quickstartInterestBonus: numberToText(script.rules.quickstartInterestBonus),
    },
    scenes: script.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      summary: scene.summary,
      location: scene.location,
      hooksText: toLineText(scene.hooks),
    })),
    encounters: script.encounters.map((encounter) => ({
      id: encounter.id,
      title: encounter.title,
      summary: encounter.summary,
      npcsText: toLineText(encounter.npcs),
      danger: encounter.danger,
    })),
  };
}

export function buildScriptDefinition(draft: ScriptDraft): ScriptDefinition {
  const rules: ScriptRuleOverrides = {};
  const defaultCheckDc = parseNumberOptional(draft.rules.defaultCheckDc);
  if (defaultCheckDc !== undefined) {
    rules.defaultCheckDc = defaultCheckDc;
  }
  const checkDcOverrides = parseNumberMap(draft.rules.checkDcOverridesText);
  if (checkDcOverrides) {
    rules.checkDcOverrides = checkDcOverrides;
  }
  const skillValueTrained = parseNumberOptional(draft.rules.skillValueTrained);
  if (skillValueTrained !== undefined) {
    rules.skillValueTrained = skillValueTrained;
  }
  const skillValueUntrained = parseNumberOptional(draft.rules.skillValueUntrained);
  if (skillValueUntrained !== undefined) {
    rules.skillValueUntrained = skillValueUntrained;
  }
  const skillPointBudget = parseNumberOptional(draft.rules.skillPointBudget);
  if (skillPointBudget !== undefined) {
    rules.skillPointBudget = skillPointBudget;
  }
  const skillMaxValue = parseNumberOptional(draft.rules.skillMaxValue);
  if (skillMaxValue !== undefined) {
    rules.skillMaxValue = skillMaxValue;
  }
  const skillBaseValues = parseNumberMap(draft.rules.skillBaseValuesText);
  if (skillBaseValues) {
    rules.skillBaseValues = skillBaseValues;
  }
  if (draft.rules.skillAllocationMode) {
    rules.skillAllocationMode = draft.rules.skillAllocationMode;
  }
  const quickstartCoreValues = parseNumberList(draft.rules.quickstartCoreValuesText);
  if (quickstartCoreValues.length > 0) {
    rules.quickstartCoreValues = quickstartCoreValues;
  }
  const quickstartInterestCount = parseNumberOptional(draft.rules.quickstartInterestCount);
  if (quickstartInterestCount !== undefined) {
    rules.quickstartInterestCount = quickstartInterestCount;
  }
  const quickstartInterestBonus = parseNumberOptional(draft.rules.quickstartInterestBonus);
  if (quickstartInterestBonus !== undefined) {
    rules.quickstartInterestBonus = quickstartInterestBonus;
  }

  const attributeRanges = ATTRIBUTE_KEYS.reduce<Partial<Record<AttributeKey, { min: number; max: number }>>>(
    (acc, key) => {
      const range = draft.attributeRanges[key];
      const minValue = parseNumberOptional(range.min);
      const maxValue = parseNumberOptional(range.max);
      if (minValue === undefined && maxValue === undefined) {
        return acc;
      }
      const safeMin = minValue ?? maxValue ?? 0;
      const safeMax = maxValue ?? minValue ?? 0;
      acc[key] = { min: safeMin, max: safeMax };
      return acc;
    },
    {},
  );

  const storyArcs: ScriptStoryArc[] = draft.storyArcs
    .map((arc) => ({
      id: ensureId(arc.id, arc.title, 'arc'),
      title: arc.title.trim(),
      summary: arc.summary.trim(),
      beats: parseLineText(arc.beatsText),
      reveals: parseLineText(arc.revealsText),
    }))
    .filter((arc) => arc.title || arc.summary);

  const scenes: ScriptScene[] = draft.scenes
    .map((scene) => ({
      id: ensureId(scene.id, scene.title, 'scene'),
      title: scene.title.trim(),
      summary: scene.summary.trim(),
      location: scene.location.trim(),
      hooks: parseLineText(scene.hooksText),
    }))
    .filter((scene) => scene.title || scene.summary);

  const encounters: ScriptEncounter[] = draft.encounters
    .map((encounter) => ({
      id: ensureId(encounter.id, encounter.title, 'encounter'),
      title: encounter.title.trim(),
      summary: encounter.summary.trim(),
      npcs: parseLineText(encounter.npcsText),
      danger: encounter.danger.trim(),
    }))
    .filter((encounter) => encounter.title || encounter.summary);

  const npcProfiles: ScriptNpcProfile[] = draft.npcProfiles
    .map((npc) => ({
      id: ensureId(npc.id, npc.name, 'npc'),
      name: npc.name.trim(),
      type: npc.type.trim(),
      role:
        npc.role.trim() === 'ally' || npc.role.trim() === 'neutral' || npc.role.trim() === 'enemy'
          ? (npc.role.trim() as ScriptNpcProfile['role'])
          : 'neutral',
      threat: npc.threat.trim(),
      summary: npc.summary.trim(),
      useWhen: npc.useWhen.trim(),
      status: npc.status.trim(),
      hp: parseNumberValue(npc.hp),
      armor: parseNumberOptional(npc.armor),
      move: parseNumberOptional(npc.move),
      attacks: parseNpcAttacks(npc.attacksText),
      skills: parseNpcSkills(npc.skillsText),
      traits: parseLineText(npc.traitsText),
      tactics: npc.tactics.trim(),
      weakness: npc.weakness.trim(),
      sanityLoss: npc.sanityLoss.trim(),
    }))
    .filter((npc) => npc.name || npc.summary);

  return {
    id: draft.id,
    title: draft.title.trim(),
    summary: draft.summary.trim(),
    setting: draft.setting.trim(),
    difficulty: draft.difficulty.trim(),
    openingMessages: draft.openingMessages.filter((item) => item.content.trim()),
    background: {
      overview: draft.background.overview.trim(),
      truth: draft.background.truth.trim(),
      themes: parseLineText(draft.background.themesText),
      factions: parseLineText(draft.background.factionsText),
      locations: parseLineText(draft.background.locationsText),
      secrets: parseLineText(draft.background.secretsText),
    },
    storyArcs,
    npcProfiles,
    skillOptions: parseSkillOptions(draft.skillOptionsText),
    equipmentOptions: parseLineText(draft.equipmentOptionsText),
    occupationOptions: parseLineText(draft.occupationOptionsText),
    originOptions: parseLineText(draft.originOptionsText),
    buffOptions: parseLineText(draft.buffOptionsText),
    debuffOptions: parseLineText(draft.debuffOptionsText),
    attributeRanges,
    attributePointBudget: parseNumberValue(draft.attributePointBudget),
    skillLimit: parseNumberValue(draft.skillLimit),
    equipmentLimit: parseNumberValue(draft.equipmentLimit),
    buffLimit: parseNumberValue(draft.buffLimit),
    debuffLimit: parseNumberValue(draft.debuffLimit),
    rules,
    scenes,
    encounters,
  };
}

export function createOpeningMessageDraft(): OpeningMessageDraft {
  return {
    role: 'dm',
    speaker: '',
    content: '',
  };
}

export function createStoryArcDraft(): StoryArcDraft {
  return {
    id: createId('arc'),
    title: '',
    summary: '',
    beatsText: '',
    revealsText: '',
  };
}

export function createSceneDraft(): SceneDraft {
  return {
    id: createId('scene'),
    title: '',
    summary: '',
    location: '',
    hooksText: '',
  };
}

export function createEncounterDraft(): EncounterDraft {
  return {
    id: createId('encounter'),
    title: '',
    summary: '',
    npcsText: '',
    danger: '',
  };
}

export function createNpcProfileDraft(): NpcProfileDraft {
  return {
    id: createId('npc'),
    name: '',
    type: '',
    role: 'neutral',
    threat: '',
    summary: '',
    useWhen: '',
    status: '',
    hp: '',
    armor: '',
    move: '',
    attacksText: '',
    skillsText: '',
    traitsText: '',
    tactics: '',
    weakness: '',
    sanityLoss: '',
  };
}
