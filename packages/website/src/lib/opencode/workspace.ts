const DEFAULT_WORKSPACE_ROOT = '/workspace';

function getWorkspaceRoot(): string {
  return (process.env.OPENCODE_WORKSPACE_ROOT?.trim() || DEFAULT_WORKSPACE_ROOT).replace(/\/+$/, '');
}

function isWorkspacePersistent(): boolean {
  return Boolean(process.env.OPENCODE_WORKSPACE_ROOT?.trim());
}

export function buildWorkspacePath(userId: string, gameId: string): string {
  return `${getWorkspaceRoot()}/${userId}/${gameId}`;
}

export function buildModuleDraftWorkspacePath(slug: string): string {
  return `${getWorkspaceRoot()}/modules/drafts/${slug}`;
}

export function buildPublishedModuleWorkspacePath(moduleId: string): string {
  return `${getWorkspaceRoot()}/modules/published/${moduleId}`;
}

export async function ensureWorkspace(userId: string, gameId: string): Promise<string> {
  const workspacePath = buildWorkspacePath(userId, gameId);
  if (isWorkspacePersistent()) {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(workspacePath, { recursive: true });
  }
  return workspacePath;
}

export async function ensureModuleDraftWorkspace(slug: string): Promise<string> {
  const workspacePath = buildModuleDraftWorkspacePath(slug);
  if (isWorkspacePersistent()) {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(workspacePath, { recursive: true });
    await mkdir(`${workspacePath}/data`, { recursive: true });
    await mkdir(`${workspacePath}/data/modules`, { recursive: true });
    await mkdir(`${workspacePath}/data/characters`, { recursive: true });
  }
  return workspacePath;
}

export async function ensurePublishedModuleWorkspace(moduleId: string): Promise<string> {
  const workspacePath = buildPublishedModuleWorkspacePath(moduleId);
  if (isWorkspacePersistent()) {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(workspacePath, { recursive: true });
  }
  return workspacePath;
}

export async function copyDirectoryIfExists(source: string, destination: string): Promise<boolean> {
  if (!isWorkspacePersistent()) {
    return false;
  }
  const { cp, stat } = await import('node:fs/promises');
  try {
    const info = await stat(source);
    if (!info.isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }
  await cp(source, destination, { recursive: true, force: true });
  return true;
}

export async function writeWorkspaceJsonFile(filePath: string, payload: unknown): Promise<void> {
  if (!isWorkspacePersistent()) {
    return;
  }
  const { mkdir, writeFile } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export async function materializeModuleIntoGameWorkspace(input: {
  moduleId: string;
  moduleData: Record<string, unknown>;
  gameWorkspacePath: string;
}): Promise<void> {
  if (!isWorkspacePersistent()) {
    return;
  }
  const publishedPath = buildPublishedModuleWorkspacePath(input.moduleId);
  await copyDirectoryIfExists(publishedPath, input.gameWorkspacePath);
  await writeWorkspaceJsonFile(`${input.gameWorkspacePath}/data/modules/${input.moduleId}.json`, input.moduleData);
}
