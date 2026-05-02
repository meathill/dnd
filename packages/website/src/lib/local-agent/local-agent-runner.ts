import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SAMPLE_SCRIPT } from '../game/sample-script.ts';
import { ensureLocalWorkspace } from './file-repository.ts';
import { LOCAL_DM_SYSTEM_PROMPT } from './prompt.ts';
import { buildSampleCharacter } from './sample-artifacts.ts';
import { serializeLocalAgentSkill } from './skill-contract.ts';
import { executeLocalAgentSkill, localAgentSkills } from './skills.ts';
import { buildSkillMarkdown } from './skill-markdown.ts';

export type LocalAgentBootstrapResult = {
  promptFilePath: string;
  skillFilePaths: string[];
  moduleFilePath: string;
  characterFilePath: string;
  reportFilePath: string;
};

async function writeSkillContracts(rootDir: string): Promise<string[]> {
  const layout = await ensureLocalWorkspace(rootDir);
  const filePaths = await Promise.all(
    localAgentSkills.map(async (skill) => {
      const contract = serializeLocalAgentSkill(skill);
      const skillDir = join(layout.skillsDir, contract.name);
      const skillFilePath = join(skillDir, 'SKILL.md');
      await mkdir(skillDir, { recursive: true });
      await writeFile(skillFilePath, buildSkillMarkdown(contract), 'utf8');
      return skillFilePath;
    }),
  );
  return filePaths.sort();
}

async function writePrompt(rootDir: string): Promise<string> {
  const layout = await ensureLocalWorkspace(rootDir);
  const filePath = join(layout.promptsDir, 'dm-system-prompt.md');
  await writeFile(filePath, `${LOCAL_DM_SYSTEM_PROMPT}\n`, 'utf8');
  return filePath;
}

export async function bootstrapLocalAgentWorkspace(rootDir: string): Promise<LocalAgentBootstrapResult> {
  const character = buildSampleCharacter();
  const promptFilePath = await writePrompt(rootDir);
  const skillFilePaths = await writeSkillContracts(rootDir);

  const moduleResult = (await executeLocalAgentSkill(
    'save_local_module',
    { module: SAMPLE_SCRIPT, source: 'demo' },
    { rootDir },
  )) as { filePath: string };

  const characterResult = (await executeLocalAgentSkill(
    'save_local_character',
    { character, source: 'demo' },
    { rootDir },
  )) as { filePath: string; artifact: { id: string } };

  const reportResult = (await executeLocalAgentSkill(
    'save_local_report',
    {
      reportId: 'report-bootstrap-demo',
      title: '启动验证战报',
      moduleId: SAMPLE_SCRIPT.id,
      characterId: characterResult.artifact.id,
      summary: '完成 skills contract、本地 prompt 与样例产物落盘。',
      content: [
        '# 启动验证',
        '',
        '- 已写入 DM system prompt。',
        '- 已导出可被 skills CLI 消费的 SKILL.md 技能包。',
        '- 已保存样例模组与人物卡。',
      ].join('\n'),
      source: 'demo',
    },
    { rootDir },
  )) as { filePath: string };

  return {
    promptFilePath,
    skillFilePaths,
    moduleFilePath: moduleResult.filePath,
    characterFilePath: characterResult.filePath,
    reportFilePath: reportResult.filePath,
  };
}
