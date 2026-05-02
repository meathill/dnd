import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bootstrapLocalAgentWorkspace } from './local-agent-runner';

describe('local agent runner', () => {
  it('会把 prompt、skills 和样例产物写入工作区', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'dnd-local-agent-runner-'));

    const result = await bootstrapLocalAgentWorkspace(rootDir);

    const promptContent = await readFile(result.promptFilePath, 'utf8');
    const skillContent = await readFile(result.skillFilePaths[0], 'utf8');
    const moduleContent = await readFile(result.moduleFilePath, 'utf8');
    const characterContent = await readFile(result.characterFilePath, 'utf8');
    const reportContent = await readFile(result.reportFilePath, 'utf8');

    expect(result.skillFilePaths.length).toBeGreaterThanOrEqual(10);
    expect(promptContent).toContain('肉团长');
    expect(skillContent).toContain('name:');
    expect(skillContent).toContain('## Contract');
    expect(moduleContent).toContain('"kind": "module"');
    expect(characterContent).toContain('"kind": "character"');
    expect(reportContent).toContain('kind: report');
    expect(reportContent).toContain('# 启动验证');
  });
});
