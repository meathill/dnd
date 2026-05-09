import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export function buildSessionWorkspacePath(workspaceRoot: string, sessionId: string): string {
  return resolve(workspaceRoot, 'sessions', sessionId);
}

export function buildPublishedModuleWorkspacePath(workspaceRoot: string, publishedModuleId: string): string {
  return resolve(workspaceRoot, 'published', publishedModuleId);
}

export async function prepareSessionWorkspace(input: {
  sessionWorkspacePath: string;
  skillsSourceDir: string;
  meta: Record<string, unknown> | null;
  initialModuleData: Record<string, unknown> | null;
  moduleSlug: string | null;
}): Promise<void> {
  await mkdir(resolve(input.sessionWorkspacePath, 'data', 'modules'), { recursive: true });
  await mkdir(resolve(input.sessionWorkspacePath, 'data', 'characters'), { recursive: true });
  await mkdir(resolve(input.sessionWorkspacePath, 'data', 'reports'), { recursive: true });
  await copySkillsTemplate(input.skillsSourceDir, input.sessionWorkspacePath);
  if (input.meta) {
    await writeJsonFile(resolve(input.sessionWorkspacePath, 'meta.json'), input.meta);
  }
  if (input.initialModuleData && input.moduleSlug) {
    await writeJsonFile(
      resolve(input.sessionWorkspacePath, 'data', 'modules', `${input.moduleSlug}.json`),
      input.initialModuleData,
    );
  }
}

async function copySkillsTemplate(skillsSourceDir: string, sessionWorkspacePath: string): Promise<void> {
  if (!(await directoryExists(skillsSourceDir))) {
    return;
  }
  const target = resolve(sessionWorkspacePath, '.opencode', 'skills');
  await mkdir(dirname(target), { recursive: true });
  await cp(skillsSourceDir, target, { recursive: true, force: true });
}

export async function readSessionModuleData(
  sessionWorkspacePath: string,
  moduleSlug: string,
): Promise<Record<string, unknown> | null> {
  const filePath = resolve(sessionWorkspacePath, 'data', 'modules', `${moduleSlug}.json`);
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function publishSessionWorkspace(input: {
  sessionWorkspacePath: string;
  publishedWorkspacePath: string;
}): Promise<void> {
  await mkdir(input.publishedWorkspacePath, { recursive: true });
  await cp(input.sessionWorkspacePath, input.publishedWorkspacePath, { recursive: true, force: true });
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}
