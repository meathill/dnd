import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export type InstallSkillsOptions = {
  sourceRoot: string;
  targetRoot: string;
  overwrite?: boolean;
};

export type InstalledArtifact = {
  kind: 'directory' | 'file';
  sourcePath: string;
  targetPath: string;
};

export type InstallSkillsResult = {
  targetRoot: string;
  installed: InstalledArtifact[];
  summaryFilePath: string;
};

const SOURCE_DIRECTORIES = ['skills', 'prompts', 'data'];
const SOURCE_DOCUMENTS = ['docs/external-agent-skills.md'];

function normalizeRoot(pathValue: string): string {
  const trimmed = pathValue.trim();
  if (!trimmed) {
    throw new Error('目标路径不能为空');
  }
  return resolve(trimmed);
}

async function copyDirectory(sourcePath: string, targetPath: string, overwrite: boolean): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, {
    recursive: true,
    force: overwrite,
    errorOnExist: !overwrite,
  });
}

async function copyFile(sourcePath: string, targetPath: string, overwrite: boolean): Promise<void> {
  await mkdir(dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, {
    force: overwrite,
    errorOnExist: !overwrite,
  });
}

function buildSummary(installed: InstalledArtifact[]): string {
  const lines = ['# External Agent Skills Kit', ''];
  lines.push('已安装以下内容：');
  lines.push('');
  installed.forEach((item) => {
    lines.push(`- ${item.kind}: ${item.targetPath}`);
  });
  lines.push('');
  lines.push('建议下一步：');
  lines.push('');
  lines.push('- 读取 `prompts/dm-system-prompt.md` 作为基础 system prompt');
  lines.push('- 读取 `skills/*.json` 注册工具');
  lines.push('- 参考 `docs/external-agent-skills.md` 开始验证');
  return `${lines.join('\n')}\n`;
}

export async function installSkillsToProject(options: InstallSkillsOptions): Promise<InstallSkillsResult> {
  const sourceRoot = normalizeRoot(options.sourceRoot);
  const targetRoot = normalizeRoot(options.targetRoot);
  const overwrite = options.overwrite ?? false;

  await mkdir(targetRoot, { recursive: true });

  const installed: InstalledArtifact[] = [];

  for (const relativePath of SOURCE_DIRECTORIES) {
    const sourcePath = join(sourceRoot, relativePath);
    const targetPath = join(targetRoot, relativePath);
    await copyDirectory(sourcePath, targetPath, overwrite);
    installed.push({ kind: 'directory', sourcePath, targetPath });
  }

  for (const relativePath of SOURCE_DOCUMENTS) {
    const sourcePath = join(sourceRoot, relativePath);
    const targetPath = join(targetRoot, relativePath);
    await copyFile(sourcePath, targetPath, overwrite);
    installed.push({ kind: 'file', sourcePath, targetPath });
  }

  const summaryFilePath = join(targetRoot, 'external-agent-skills', 'README.md');
  await mkdir(dirname(summaryFilePath), { recursive: true });
  await writeFile(summaryFilePath, buildSummary(installed), 'utf8');

  return {
    targetRoot,
    installed,
    summaryFilePath,
  };
}

export function resolveDefaultInstallTarget(sourceRoot: string): string {
  return join(resolve(sourceRoot), 'external-agent-sandbox');
}
