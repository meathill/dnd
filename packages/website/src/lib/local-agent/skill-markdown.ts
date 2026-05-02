import type { LocalAgentSkillContract } from './skill-contract.ts';

function renderSection(title: string, lines: string[]): string {
  if (lines.length === 0) {
    return '';
  }
  return [`## ${title}`, '', ...lines].join('\n');
}

function renderList(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

export function slugToTitle(name: string): string {
  return name
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

export function buildSkillMarkdown(skill: LocalAgentSkillContract): string {
  const usageLines = [
    '1. 先理解用户当前意图是否真的需要此 skill。',
    '2. 根据本技能的说明填写参数。',
    '3. 不要在正文里伪造 tool 调用结果。',
  ];

  if (skill.executionMode === 'native') {
    usageLines.push('4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。');
  }

  const sections = [
    '---',
    `name: ${skill.name}`,
    `description: ${skill.description}`,
    'metadata:',
    '  author: meathill',
    '  version: "1.0.0"',
    `  group: ${skill.group}`,
    `  execution-mode: ${skill.executionMode}`,
    '---',
    '',
    `# ${skill.title || slugToTitle(skill.name)}`,
    '',
    skill.description,
    '',
    renderSection('When to use', renderList(skill.whenToUse)),
    '',
    renderSection('Do not', renderList(skill.forbidden)),
    '',
    '## Contract',
    '',
    '当前 skill 的参数、边界与返回要求以本文件说明为准。',
    '',
    '## Usage',
    '',
    ...usageLines,
    '',
  ].filter(Boolean);

  return `${sections.join('\n')}\n`;
}
