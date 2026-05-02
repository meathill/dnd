import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SAMPLE_SCRIPT } from '../game/sample-script';
import type { CharacterRecord } from '../game/types';
import {
  ensureLocalWorkspace,
  listLocalArtifacts,
  loadLocalCharacterFile,
  loadLocalModuleFile,
  loadLocalReportFile,
  resolveLocalWorkspace,
  saveLocalCharacterFile,
  saveLocalModuleFile,
  saveLocalReportFile,
} from './file-repository';

function buildCharacter(): CharacterRecord {
  return {
    id: '',
    scriptId: SAMPLE_SCRIPT.id,
    name: '  阿比盖尔\n哈珀  ',
    occupation: '记者',
    age: '29',
    origin: '松柏镇',
    appearance: '穿着旧风衣，眼下发青。',
    background: '常年追踪民俗怪谈。',
    motivation: '想确认老宅事件背后的真相。',
    avatar: '',
    luck: 55,
    attributes: {
      strength: 45,
      dexterity: 55,
      constitution: 50,
      size: 55,
      intelligence: 70,
      willpower: 60,
      appearance: 50,
      education: 70,
    },
    skills: {
      spotHidden: 60,
      listen: 55,
      occult: 25,
    },
    inventory: ['手电筒', '录音机'],
    buffs: ['直觉敏锐'],
    debuffs: [],
    note: '怕黑。',
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };
}

describe('local file repository', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('会创建本地工作区目录结构', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'dnd-local-workspace-'));

    const layout = await ensureLocalWorkspace(rootDir);

    expect(layout).toEqual(resolveLocalWorkspace(rootDir));
    expect(layout.modulesDir.endsWith('/data/modules')).toBe(true);
    expect(layout.charactersDir.endsWith('/data/characters')).toBe(true);
    expect(layout.reportsDir.endsWith('/data/reports')).toBe(true);
    expect(layout.skillsDir.endsWith('/skills')).toBe(true);
    expect(layout.promptsDir.endsWith('/prompts')).toBe(true);
  });

  it('可以保存并读取模组与角色文件', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'dnd-local-artifacts-'));

    const savedModule = await saveLocalModuleFile({
      rootDir,
      module: {
        ...SAMPLE_SCRIPT,
        id: '',
        title: '  雨夜\n老宅调查  ',
      },
      source: 'manual',
    });
    const savedCharacter = await saveLocalCharacterFile({
      rootDir,
      character: buildCharacter(),
      source: 'ai',
    });

    const loadedModule = await loadLocalModuleFile(rootDir, savedModule.artifact.id);
    const loadedCharacter = await loadLocalCharacterFile(rootDir, savedCharacter.artifact.id);

    expect(savedModule.filePath.endsWith(`${savedModule.artifact.id}.json`)).toBe(true);
    expect(loadedModule.title).toBe('雨夜 老宅调查');
    expect(loadedModule.data.title).toBe('雨夜 老宅调查');
    expect(loadedModule.rulesetId).toBe('coc-7e-lite');
    expect(savedCharacter.artifact.id).toMatch(/^character-/);
    expect(loadedCharacter.name).toBe('阿比盖尔 哈珀');
    expect(loadedCharacter.data.name).toBe('阿比盖尔 哈珀');
    expect(loadedCharacter.moduleId).toBe(SAMPLE_SCRIPT.id);
  });

  it('可以保存读取战报并在重复写入时保留 createdAt', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'dnd-local-reports-'));

    const first = await saveLocalReportFile({
      rootDir,
      reportId: 'report-session-1',
      title: '  第一夜\n老宅记录  ',
      moduleId: SAMPLE_SCRIPT.id,
      characterId: 'character-abigail',
      summary: '  调查员进入老宅，确认地下室存在异常。\n  ',
      content: '玩家进入院子，发现被雨水冲散的盐圈。',
      source: 'demo',
    });
    const second = await saveLocalReportFile({
      rootDir,
      reportId: 'report-session-1',
      title: '第一夜老宅记录',
      moduleId: SAMPLE_SCRIPT.id,
      characterId: 'character-abigail',
      summary: '调查员遭遇了邪灵显形的前兆。',
      content: '更新后的战报内容。',
      source: 'demo',
    });

    const loaded = await loadLocalReportFile(rootDir, 'report-session-1');

    expect(first.metadata.createdAt).toBe(second.metadata.createdAt);
    expect(second.metadata.updatedAt >= first.metadata.updatedAt).toBe(true);
    expect(loaded.metadata.title).toBe('第一夜老宅记录');
    expect(loaded.metadata.summary).toBe('调查员遭遇了邪灵显形的前兆。');
    expect(loaded.content).toBe('更新后的战报内容。');
  });

  it('会按更新时间倒序列出本地产物', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'dnd-local-list-'));

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T00:00:00.000Z'));
    const moduleOne = await saveLocalModuleFile({
      rootDir,
      module: { ...SAMPLE_SCRIPT, id: 'module-a', title: '模组 A' },
      source: 'manual',
    });
    vi.setSystemTime(new Date('2026-05-01T00:00:01.000Z'));
    await saveLocalModuleFile({
      rootDir,
      module: { ...SAMPLE_SCRIPT, id: 'module-b', title: '模组 B' },
      source: 'manual',
    });
    vi.setSystemTime(new Date('2026-05-01T00:00:02.000Z'));
    await saveLocalCharacterFile({
      rootDir,
      character: { ...buildCharacter(), id: 'character-a', name: '角色 A' },
      source: 'manual',
    });
    vi.setSystemTime(new Date('2026-05-01T00:00:03.000Z'));
    await saveLocalReportFile({
      rootDir,
      reportId: 'report-a',
      title: '报告 A',
      moduleId: SAMPLE_SCRIPT.id,
      content: '内容 A',
      source: 'manual',
    });

    const modules = await listLocalArtifacts({ rootDir, kind: 'module' });
    const characters = await listLocalArtifacts({ rootDir, kind: 'character' });
    const reports = await listLocalArtifacts({ rootDir, kind: 'report' });

    expect(modules).toHaveLength(2);
    expect(modules[0]?.id).toBe('module-b');
    expect(modules[1]?.id).toBe(moduleOne.artifact.id);
    expect(modules[0]?.filePath).toBe('data/modules/module-b.json');
    expect(characters[0]?.title).toBe('角色 A');
    expect(characters[0]?.filePath).toBe('data/characters/character-a.json');
    expect(reports[0]?.id).toBe('report-a');
    expect(reports[0]?.filePath).toBe('data/reports/report-a.md');
  });
});
