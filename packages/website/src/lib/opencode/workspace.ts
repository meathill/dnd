const DEFAULT_WORKSPACE_ROOT = '/workspace';

export function buildWorkspacePath(userId: string, gameId: string): string {
  const root = process.env.OPENCODE_WORKSPACE_ROOT?.trim() || DEFAULT_WORKSPACE_ROOT;
  return `${root.replace(/\/+$/, '')}/${userId}/${gameId}`;
}

export async function ensureWorkspace(userId: string, gameId: string): Promise<string> {
  const workspacePath = buildWorkspacePath(userId, gameId);
  const workspaceRoot = process.env.OPENCODE_WORKSPACE_ROOT?.trim();
  if (workspaceRoot) {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(workspacePath, { recursive: true });
  }
  return workspacePath;
}
