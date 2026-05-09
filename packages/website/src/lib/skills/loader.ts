import { SKILL_MANIFEST } from './manifest.generated';
import type { SkillManifestEntry, SkillScenario } from './types';

export function listAllSkills(): ReadonlyArray<SkillManifestEntry> {
  return SKILL_MANIFEST;
}

export function getSkillsForSet(scenario: SkillScenario): ReadonlyArray<SkillManifestEntry> {
  return SKILL_MANIFEST.filter((entry) => entry.scenarios.includes(scenario));
}

export function getSkillByName(name: string): SkillManifestEntry | null {
  return SKILL_MANIFEST.find((entry) => entry.name === name) ?? null;
}

export function buildSkillCatalogPrompt(scenario: SkillScenario): string {
  const skills = getSkillsForSet(scenario);
  if (skills.length === 0) {
    return '';
  }
  const lines = skills.map((entry) => `- \`${entry.name}\`：${entry.description}`);
  return ['## 可用技能（skills）', `当前会话场景：${scenario}`, ...lines, ''].join('\n');
}
