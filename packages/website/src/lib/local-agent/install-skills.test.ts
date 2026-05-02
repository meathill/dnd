import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { bootstrapLocalAgentWorkspace } from './local-agent-runner';
import { installSkillsToProject } from './install-skills';

describe('install external agent skills', () => {
  let sourceRoot: string;

  beforeEach(async () => {
    sourceRoot = await mkdtemp(join(tmpdir(), 'dnd-skill-source-'));
    await bootstrapLocalAgentWorkspace(sourceRoot);
    await mkdir(join(sourceRoot, 'docs'), { recursive: true });
    await writeFile(
      join(sourceRoot, 'docs', 'external-agent-skills.md'),
      '# External Agent Skills\n\n用于测试安装流程。\n',
      'utf8',
    );
  });

  it('可以把 skills kit 安装到目标项目目录', async () => {
    const targetRoot = await mkdtemp(join(tmpdir(), 'dnd-skill-target-'));

    const result = await installSkillsToProject({ sourceRoot, targetRoot, overwrite: true });

    const skillsEntries = await readdir(join(targetRoot, 'skills'));
    const promptContent = await readFile(join(targetRoot, 'prompts', 'dm-system-prompt.md'), 'utf8');
    const summaryContent = await readFile(result.summaryFilePath, 'utf8');

    expect(result.installed.length).toBe(4);
    expect(skillsEntries.length).toBeGreaterThanOrEqual(20);
    expect(promptContent).toContain('肉团长');
    expect(summaryContent).toContain('已安装以下内容');
    expect(summaryContent).toContain('skills');
  });

  it('默认不覆盖目标目录中的已有文件', async () => {
    const targetRoot = await mkdtemp(join(tmpdir(), 'dnd-skill-target-existing-'));
    await mkdir(join(targetRoot, 'prompts'), { recursive: true });
    await writeFile(join(targetRoot, 'prompts', 'dm-system-prompt.md'), 'old prompt\n', 'utf8');

    await expect(installSkillsToProject({ sourceRoot, targetRoot, overwrite: false })).rejects.toThrow();
  });
});
