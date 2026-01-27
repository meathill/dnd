import type { ChatModule } from './types';

type ParsedChatModules = {
  content: string;
  modules: ChatModule[];
};

const sectionLabels = ['叙事', '掷骰', '绘图', '建议'] as const;
type SectionLabel = (typeof sectionLabels)[number];

const sectionTypeMap: Record<Exclude<SectionLabel, '建议'>, ChatModule['type']> = {
  叙事: 'narrative',
  掷骰: 'dice',
  绘图: 'map',
};

const sectionRegex = /【(叙事|掷骰|绘图|建议)】/g;

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

function buildModulesFromSections(sections: Array<{ label: SectionLabel; content: string }>): ChatModule[] {
  const modules: ChatModule[] = [];
  for (const section of sections) {
    const cleaned = normalizeText(section.content);
    if (!cleaned || cleaned === '无') {
      continue;
    }
    if (section.label === '建议') {
      continue;
    }
    const moduleType = sectionTypeMap[section.label];
    modules.push({ type: moduleType, content: cleaned });
  }
  return modules;
}

export function parseChatModules(text: string): ParsedChatModules {
  const normalized = normalizeText(text);
  if (!normalized) {
    return { content: '', modules: [] };
  }
  const matches = Array.from(normalized.matchAll(sectionRegex));
  if (matches.length === 0) {
    return {
      content: normalized,
      modules: [{ type: 'narrative', content: normalized }],
    };
  }

  const sections: Array<{ label: SectionLabel; content: string }> = [];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const label = match[1] as SectionLabel;
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? normalized.length) : normalized.length;
    const content = normalized.slice(start, end);
    sections.push({ label, content });
  }

  const preface = normalized.slice(0, matches[0]?.index ?? 0).trim();
  const modules = buildModulesFromSections(sections);
  if (preface) {
    modules.unshift({ type: 'narrative', content: preface });
  }

  const narrative = modules.find((module) => module.type === 'narrative');
  return {
    content: narrative?.type === 'narrative' ? narrative.content : normalized,
    modules,
  };
}

export function buildMessageContentFromModules(modules: ChatModule[], fallback: string): string {
  if (!modules || modules.length === 0) {
    return fallback;
  }
  const narrative = modules.find((module) => module.type === 'narrative');
  const extra = modules
    .filter((module) => module.type !== 'narrative' && module.type !== 'suggestions')
    .map((module) => {
      if ('content' in module) {
        return module.content;
      }
      return '';
    })
    .filter(Boolean)
    .join('\n');
  return [narrative?.type === 'narrative' ? narrative.content : '', extra].filter(Boolean).join('\n');
}
