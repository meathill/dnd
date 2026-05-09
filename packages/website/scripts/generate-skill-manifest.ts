#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

type SkillScenario = 'authoring' | 'play';

type SkillFrontmatter = {
  name?: unknown;
  description?: unknown;
  scenarios?: unknown;
};

type SkillManifestEntry = {
  name: string;
  description: string;
  scenarios: SkillScenario[];
  body: string;
};

const repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..');
const skillsRoot = resolve(repoRoot, 'skills');
const outputPath = resolve(repoRoot, 'packages', 'website', 'src', 'lib', 'skills', 'manifest.generated.ts');

function parseFrontmatter(source: string): { data: SkillFrontmatter; body: string } {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: source };
  }
  const data = (parseYaml(match[1] ?? '') ?? {}) as SkillFrontmatter;
  return { data, body: match[2] ?? '' };
}

function normalizeScenarios(value: unknown): SkillScenario[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<SkillScenario>();
  for (const entry of value) {
    if (entry === 'authoring' || entry === 'play') {
      seen.add(entry);
    }
  }
  return Array.from(seen);
}

async function loadSkill(name: string): Promise<SkillManifestEntry | null> {
  const filePath = resolve(skillsRoot, name, 'SKILL.md');
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const { data, body } = parseFrontmatter(raw);
  const skillName = typeof data.name === 'string' ? data.name : name;
  const description = typeof data.description === 'string' ? data.description : '';
  const scenarios = normalizeScenarios(data.scenarios);
  if (scenarios.length === 0) {
    console.warn(`[skills] ${name} 缺少 scenarios，默认仅参与 play`);
    scenarios.push('play');
  }
  return {
    name: skillName,
    description,
    scenarios,
    body: body.trim(),
  };
}

async function main(): Promise<void> {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  dirs.sort();
  const manifest: SkillManifestEntry[] = [];
  for (const name of dirs) {
    const skill = await loadSkill(name);
    if (skill) {
      manifest.push(skill);
    }
  }

  const output = `// 自动生成，请勿手工编辑。运行 pnpm skills:build 重新生成。
// 数据源：repo/skills/*/SKILL.md
import type { SkillManifestEntry } from './types';

export const SKILL_MANIFEST: ReadonlyArray<SkillManifestEntry> = ${JSON.stringify(manifest, null, 2)};
`;

  await writeFile(outputPath, output, 'utf8');
  console.log(`[skills] 已生成 ${manifest.length} 个技能的 manifest -> ${outputPath}`);
}

await main();
