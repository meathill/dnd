#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const skillsRoot = resolve(repoRoot, 'skills');

type Scenario = 'authoring' | 'play';

const SCENARIO_BY_SKILL: Record<string, Scenario[]> = {
  // 模组创作专用
  patch_basic: ['authoring'],
  patch_background: ['authoring'],
  patch_npc: ['authoring'],
  patch_scene: ['authoring'],
  patch_options: ['authoring'],
  remove_npc: ['authoring'],
  remove_scene: ['authoring'],
  save_local_module: ['authoring'],
  validate_module_playability: ['authoring'],
  create_module: ['authoring'],

  // 游戏运行专用
  roll_dice: ['play'],
  validate_player_action: ['play'],
  roleplay_npc: ['play'],
  estimate_scene_risk: ['play'],
  save_dm_note: ['play'],
  save_local_report: ['play'],
  create_temp_npc: ['play'],
  patch_character: ['play'],

  // 共享：创作与游戏均可用
  get_creature_profile: ['authoring', 'play'],
  get_rule_entry: ['authoring', 'play'],
  get_standard_npc: ['authoring', 'play'],
  list_local_artifacts: ['authoring', 'play'],
  search_rulebook: ['authoring', 'play'],
  select_ruleset: ['authoring', 'play'],
  create_character: ['authoring', 'play'],
  validate_character: ['authoring', 'play'],
  save_local_character: ['authoring', 'play'],
};

function buildScenarioLine(scenarios: Scenario[]): string {
  return `scenarios: [${scenarios.join(', ')}]`;
}

async function tag(skillName: string, scenarios: Scenario[]): Promise<void> {
  const filePath = resolve(skillsRoot, skillName, 'SKILL.md');
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    console.warn(`[skills] 找不到 ${filePath}`);
    return;
  }
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    console.warn(`[skills] ${skillName} 没有 frontmatter，跳过`);
    return;
  }
  const frontmatter = match[1] ?? '';
  const body = match[2] ?? '';
  const lines = frontmatter.split('\n');
  const scenarioIndex = lines.findIndex((line) => line.startsWith('scenarios:'));
  const scenarioLine = buildScenarioLine(scenarios);
  if (scenarioIndex >= 0) {
    lines[scenarioIndex] = scenarioLine;
  } else {
    const descriptionIndex = lines.findIndex((line) => line.startsWith('description:'));
    const insertAt = descriptionIndex >= 0 ? descriptionIndex + 1 : lines.length;
    lines.splice(insertAt, 0, scenarioLine);
  }
  const next = `---\n${lines.join('\n')}\n---\n${body}`;
  await writeFile(filePath, next, 'utf8');
  console.log(`[skills] ${skillName} -> ${scenarios.join(', ')}`);
}

async function main(): Promise<void> {
  for (const [skill, scenarios] of Object.entries(SCENARIO_BY_SKILL)) {
    await tag(skill, scenarios);
  }
}

await main();
