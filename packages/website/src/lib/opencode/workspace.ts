import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export function buildWorkspacePath(userId: string, gameId: string): string {
  const root = process.env.OPENCODE_WORKSPACE_ROOT?.trim() || resolve(process.cwd(), '..', '..', 'workspace');
  return join(root, userId, gameId);
}

export async function ensureWorkspace(userId: string, gameId: string): Promise<string> {
  const workspacePath = buildWorkspacePath(userId, gameId);
  await mkdir(workspacePath, { recursive: true });
  return workspacePath;
}
