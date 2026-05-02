import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { DEFAULT_RULESET_ID } from '../game/types.ts';
import type { CharacterRecord, ScriptDefinition } from '../game/types.ts';

export type LocalArtifactKind = 'module' | 'character' | 'report';

export type LocalArtifactSource = 'ai' | 'manual' | 'demo';

export type LocalModuleFile = {
  schemaVersion: 1;
  kind: 'module';
  id: string;
  title: string;
  rulesetId: string;
  source: LocalArtifactSource;
  createdAt: string;
  updatedAt: string;
  data: ScriptDefinition;
};

export type LocalCharacterFile = {
  schemaVersion: 1;
  kind: 'character';
  id: string;
  moduleId: string;
  name: string;
  source: LocalArtifactSource;
  createdAt: string;
  updatedAt: string;
  data: CharacterRecord;
};

export type LocalReportMetadata = {
  kind: 'report';
  id: string;
  title: string;
  moduleId: string;
  characterId?: string;
  source: LocalArtifactSource;
  createdAt: string;
  updatedAt: string;
  summary?: string;
};

export type LocalArtifactListItem = {
  kind: LocalArtifactKind;
  id: string;
  title: string;
  updatedAt: string;
  filePath: string;
};

export type LocalWorkspaceLayout = {
  rootDir: string;
  dataDir: string;
  modulesDir: string;
  charactersDir: string;
  reportsDir: string;
  skillsDir: string;
  promptsDir: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
}

function ensureId(rawId: string, fallback: string, prefix: string): string {
  const trimmed = rawId.trim();
  if (trimmed) {
    return trimmed;
  }
  const slug = slugify(fallback);
  return slug ? `${prefix}-${slug}` : `${prefix}-${Date.now()}`;
}

function normalizeInlineText(value: string | undefined, fallback = ''): string {
  const normalized = (value ?? '').replace(/\r?\n+/g, ' ').trim();
  return normalized || fallback;
}

function buildFrontmatter(metadata: LocalReportMetadata): string {
  const lines = ['---'];
  lines.push(`kind: ${metadata.kind}`);
  lines.push(`id: ${metadata.id}`);
  lines.push(`title: ${normalizeInlineText(metadata.title, metadata.id)}`);
  lines.push(`moduleId: ${normalizeInlineText(metadata.moduleId)}`);
  if (metadata.characterId) {
    lines.push(`characterId: ${normalizeInlineText(metadata.characterId)}`);
  }
  lines.push(`source: ${normalizeInlineText(metadata.source)}`);
  lines.push(`createdAt: ${normalizeInlineText(metadata.createdAt)}`);
  lines.push(`updatedAt: ${normalizeInlineText(metadata.updatedAt)}`);
  if (metadata.summary) {
    lines.push(`summary: ${normalizeInlineText(metadata.summary)}`);
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(content: string): { metadata: Record<string, string>; body: string } {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { metadata: {}, body: normalized };
  }
  const endIndex = normalized.indexOf('\n---\n', 4);
  if (endIndex < 0) {
    return { metadata: {}, body: normalized };
  }
  const frontmatterText = normalized.slice(4, endIndex);
  const body = normalized.slice(endIndex + 5);
  const metadata: Record<string, string> = {};
  frontmatterText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex < 0) {
        return;
      }
      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key) {
        metadata[key] = value;
      }
    });
  return { metadata, body };
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

export function resolveLocalWorkspace(rootDir: string): LocalWorkspaceLayout {
  const absoluteRoot = resolve(rootDir);
  const dataDir = join(absoluteRoot, 'data');
  return {
    rootDir: absoluteRoot,
    dataDir,
    modulesDir: join(dataDir, 'modules'),
    charactersDir: join(dataDir, 'characters'),
    reportsDir: join(dataDir, 'reports'),
    skillsDir: join(absoluteRoot, 'skills'),
    promptsDir: join(absoluteRoot, 'prompts'),
  };
}

export async function ensureLocalWorkspace(rootDir: string): Promise<LocalWorkspaceLayout> {
  const layout = resolveLocalWorkspace(rootDir);
  await Promise.all([
    mkdir(layout.dataDir, { recursive: true }),
    mkdir(layout.modulesDir, { recursive: true }),
    mkdir(layout.charactersDir, { recursive: true }),
    mkdir(layout.reportsDir, { recursive: true }),
    mkdir(layout.skillsDir, { recursive: true }),
    mkdir(layout.promptsDir, { recursive: true }),
  ]);
  return layout;
}

export async function saveLocalModuleFile(params: {
  rootDir: string;
  module: ScriptDefinition;
  source?: LocalArtifactSource;
}): Promise<{ filePath: string; artifact: LocalModuleFile }> {
  const layout = await ensureLocalWorkspace(params.rootDir);
  const timestamp = nowIso();
  const id = ensureId(params.module.id, params.module.title, 'module');
  const title = normalizeInlineText(params.module.title, id);
  const rulesetId = params.module.rulesetId.trim() || DEFAULT_RULESET_ID;
  const filePath = join(layout.modulesDir, `${id}.json`);
  const previous = await loadLocalModuleFile(params.rootDir, id).catch(() => null);
  const artifact: LocalModuleFile = {
    schemaVersion: 1,
    kind: 'module',
    id,
    title,
    rulesetId,
    source: params.source ?? previous?.source ?? 'ai',
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    data: { ...params.module, id, title, rulesetId },
  };
  await writeJsonFile(filePath, artifact);
  return { filePath, artifact };
}

export async function loadLocalModuleFile(rootDir: string, id: string): Promise<LocalModuleFile> {
  const layout = resolveLocalWorkspace(rootDir);
  return readJsonFile<LocalModuleFile>(join(layout.modulesDir, `${id}.json`));
}

export async function saveLocalCharacterFile(params: {
  rootDir: string;
  character: CharacterRecord;
  source?: LocalArtifactSource;
}): Promise<{ filePath: string; artifact: LocalCharacterFile }> {
  const layout = await ensureLocalWorkspace(params.rootDir);
  const timestamp = nowIso();
  const id = ensureId(params.character.id, params.character.name, 'character');
  const name = normalizeInlineText(params.character.name, id);
  const filePath = join(layout.charactersDir, `${id}.json`);
  const previous = await loadLocalCharacterFile(params.rootDir, id).catch(() => null);
  const artifact: LocalCharacterFile = {
    schemaVersion: 1,
    kind: 'character',
    id,
    moduleId: params.character.scriptId,
    name,
    source: params.source ?? previous?.source ?? 'ai',
    createdAt: previous?.createdAt ?? timestamp,
    updatedAt: timestamp,
    data: { ...params.character, id, name },
  };
  await writeJsonFile(filePath, artifact);
  return { filePath, artifact };
}

export async function loadLocalCharacterFile(rootDir: string, id: string): Promise<LocalCharacterFile> {
  const layout = resolveLocalWorkspace(rootDir);
  return readJsonFile<LocalCharacterFile>(join(layout.charactersDir, `${id}.json`));
}

export async function saveLocalReportFile(params: {
  rootDir: string;
  title: string;
  moduleId: string;
  characterId?: string;
  content: string;
  summary?: string;
  source?: LocalArtifactSource;
  reportId?: string;
}): Promise<{ filePath: string; metadata: LocalReportMetadata }> {
  const layout = await ensureLocalWorkspace(params.rootDir);
  const timestamp = nowIso();
  const id = ensureId(params.reportId ?? '', params.title, 'report');
  const title = normalizeInlineText(params.title, id);
  const summary = normalizeInlineText(params.summary, '');
  const filePath = join(layout.reportsDir, `${id}.md`);
  const previous = await loadLocalReportFile(params.rootDir, id).catch(() => null);
  const metadata: LocalReportMetadata = {
    kind: 'report',
    id,
    title,
    moduleId: params.moduleId,
    ...(params.characterId
      ? { characterId: params.characterId }
      : previous?.metadata.characterId
        ? { characterId: previous.metadata.characterId }
        : {}),
    source: params.source ?? previous?.metadata.source ?? 'ai',
    createdAt: previous?.metadata.createdAt ?? timestamp,
    updatedAt: timestamp,
    ...(summary ? { summary } : previous?.metadata.summary ? { summary: previous.metadata.summary } : {}),
  };
  const output = `${buildFrontmatter(metadata)}\n\n${params.content.trim()}\n`;
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, output, 'utf8');
  return { filePath, metadata };
}

export async function loadLocalReportFile(
  rootDir: string,
  id: string,
): Promise<{ metadata: LocalReportMetadata; content: string }> {
  const layout = resolveLocalWorkspace(rootDir);
  const raw = await readFile(join(layout.reportsDir, `${id}.md`), 'utf8');
  const parsed = parseFrontmatter(raw);
  const metadata: LocalReportMetadata = {
    kind: 'report',
    id: parsed.metadata.id ?? id,
    title: parsed.metadata.title ?? id,
    moduleId: parsed.metadata.moduleId ?? '',
    ...(parsed.metadata.characterId ? { characterId: parsed.metadata.characterId } : {}),
    source: (parsed.metadata.source as LocalArtifactSource | undefined) ?? 'ai',
    createdAt: parsed.metadata.createdAt ?? '',
    updatedAt: parsed.metadata.updatedAt ?? '',
    ...(parsed.metadata.summary ? { summary: parsed.metadata.summary } : {}),
  };
  return { metadata, content: parsed.body.trim() };
}

export async function listLocalArtifacts(params: {
  rootDir: string;
  kind: LocalArtifactKind;
}): Promise<LocalArtifactListItem[]> {
  const layout = resolveLocalWorkspace(params.rootDir);
  const targetDir =
    params.kind === 'module'
      ? layout.modulesDir
      : params.kind === 'character'
        ? layout.charactersDir
        : layout.reportsDir;
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(targetDir);

  if (params.kind === 'module') {
    const items = await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map(async (entry) => {
          const artifact = await readJsonFile<LocalModuleFile>(join(targetDir, entry));
          return {
            kind: 'module' as const,
            id: artifact.id,
            title: artifact.title,
            updatedAt: artifact.updatedAt,
            filePath: join('data', 'modules', entry),
          };
        }),
    );
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  if (params.kind === 'character') {
    const items = await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.json'))
        .map(async (entry) => {
          const artifact = await readJsonFile<LocalCharacterFile>(join(targetDir, entry));
          return {
            kind: 'character' as const,
            id: artifact.id,
            title: artifact.name,
            updatedAt: artifact.updatedAt,
            filePath: join('data', 'characters', entry),
          };
        }),
    );
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const items = await Promise.all(
    entries
      .filter((entry) => entry.endsWith('.md'))
      .map(async (entry) => {
        const raw = await readFile(join(targetDir, entry), 'utf8');
        const parsed = parseFrontmatter(raw);
        return {
          kind: 'report' as const,
          id: parsed.metadata.id ?? entry.replace(/\.md$/, ''),
          title: parsed.metadata.title ?? entry,
          updatedAt: parsed.metadata.updatedAt ?? '',
          filePath: join('data', 'reports', entry),
        };
      }),
  );
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
