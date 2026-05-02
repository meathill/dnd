import { estimateCocSceneRisk, validateCocModulePlayability } from './rulebook';
import type { CharacterRecord, ChatMessage, GameMemorySnapshot, ScriptDefinition } from './types';
import type { LocalPlayReport } from './local-play-types';

function nowIso(): string {
  return new Date().toISOString();
}

export function buildLocalPlayReport(script: ScriptDefinition): LocalPlayReport {
  const playability = validateCocModulePlayability(script);
  const encounterRisks = script.encounters.map((encounter) => {
    const estimate = estimateCocSceneRisk({
      rulesetId: script.rulesetId,
      party: { investigatorCount: 1, experience: 'new' },
      entityRefs: encounter.rulebookRefs?.map((ref) => ({
        entityId: ref.entityId,
        rulesetId: ref.rulesetId,
        count: ref.count,
      })),
      cluePlan: {
        essentialClues: Math.max(1, script.background.secrets.length),
        gatedClues: Math.min(1, script.background.secrets.length),
        alternatePaths: Math.max(1, script.background.explorableAreas.length - 1),
      },
      sanityLosses: script.npcProfiles.map((npc) => npc.sanityLoss).filter(Boolean),
    });
    return {
      encounterId: encounter.id,
      title: encounter.title,
      overallRisk: estimate.overallRisk,
      warnings: estimate.warnings,
      suggestions: estimate.suggestions,
    };
  });
  return { playability, encounterRisks };
}

export function exportLocalPlayAsMarkdown(params: {
  script: ScriptDefinition;
  character: CharacterRecord | null;
  messages: ChatMessage[];
  memory: GameMemorySnapshot | null;
}): string {
  const { script, character, messages, memory } = params;
  const lines: string[] = [];
  lines.push(`# ${script.title} 本地战报`);
  lines.push('');
  lines.push(`- 规则集：${script.rulesetId}`);
  lines.push(`- 背景：${script.setting}`);
  lines.push(`- 难度：${script.difficulty}`);
  if (character) {
    lines.push(`- 角色：${character.name} / ${character.occupation} / ${character.origin}`);
  }
  if (memory?.presence.scene || memory?.presence.location) {
    lines.push(`- 最后位置：${memory.presence.scene ?? '未知场景'} / ${memory.presence.location ?? '未知地点'}`);
  }
  lines.push('');
  lines.push('## 对话记录');
  lines.push('');
  messages.forEach((message) => {
    lines.push(`### ${message.time} ${message.speaker}`);
    lines.push('');
    lines.push(
      message.content ||
        message.modules
          ?.map((module) => ('content' in module ? module.content : ''))
          .filter(Boolean)
          .join('\n') ||
        '',
    );
    if (message.modules && message.modules.length > 0) {
      lines.push('');
      message.modules.forEach((module) => {
        if ('content' in module && module.content.trim()) {
          lines.push(`- ${module.type}: ${module.content}`);
        }
      });
    }
    lines.push('');
  });
  if (memory) {
    lines.push('## 当前状态');
    lines.push('');
    lines.push(`- 地图位置：${memory.presence.location ?? '未知'}`);
    lines.push(`- 当前场景：${memory.presence.scene ?? '未知'}`);
    lines.push(`- 在场 NPC：${memory.presence.presentNpcs.join('、') || '无'}`);
    lines.push(`- 已记录区域：${memory.locations.map((item) => `${item.name}(${item.status})`).join('、') || '无'}`);
    lines.push('');
    if (memory.mapText.trim()) {
      lines.push('```text');
      lines.push(memory.mapText);
      lines.push('```');
      lines.push('');
    }
  }
  return lines.join('\n');
}

export function exportLocalPlayAsJson(params: {
  script: ScriptDefinition;
  character: CharacterRecord | null;
  messages: ChatMessage[];
  memory: GameMemorySnapshot | null;
}): string {
  return JSON.stringify(
    {
      exportedAt: nowIso(),
      ...params,
    },
    null,
    2,
  );
}
