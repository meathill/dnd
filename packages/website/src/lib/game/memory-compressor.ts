import type { AiMessage, AiProvider } from '../ai/ai-types';
import { generateChatCompletion } from '../ai/ai-provider';
import type { CharacterRecord, GameMemoryRoundSummary, ScriptDefinition } from './types';
import {
  createEmptyMemoryDelta,
  createFallbackSummaries,
  normalizeMemoryDelta,
  normalizeRoundSummaries,
} from './memory';

export type MemoryRoundInput = {
  round: number;
  playerText: string;
  dmText: string;
};

export type MemorySummaryResult = {
  roundSummaries: GameMemoryRoundSummary[];
  stateDelta: ReturnType<typeof normalizeMemoryDelta>;
};

function extractJson(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) {
    return trimmed.slice(first, last + 1);
  }
  return null;
}

function buildRoundsText(rounds: MemoryRoundInput[]): string {
  return rounds
    .map((round) => {
      const player = round.playerText.trim();
      const dm = round.dmText.trim();
      return `回合 ${round.round}\n玩家：${player || '无'}\nDM：${dm || '无'}`;
    })
    .join('\n\n');
}

export async function summarizeRounds({
  provider,
  model,
  script,
  character,
  memorySummary,
  memoryStateText,
  rounds,
}: {
  provider: AiProvider;
  model: string;
  script: ScriptDefinition;
  character: CharacterRecord;
  memorySummary: string;
  memoryStateText: string;
  rounds: MemoryRoundInput[];
}): Promise<MemorySummaryResult> {
  if (rounds.length === 0) {
    return { roundSummaries: [], stateDelta: createEmptyMemoryDelta() };
  }
  const systemPrompt = [
    '你是跑团回合压缩器，只输出 JSON。',
    '目标：压缩回合内容（排除掷骰过程），并提取对世界状态有影响的变化。',
    '输出 JSON 字段：',
    'roundSummaries: { round:number, summary:string }[]，每个回合 1-2 句，排除掷骰细节。',
    'stateDelta: {',
    'inventoryAdd: string[]，inventoryRemove: string[]，',
    'buffsAdd: string[]，buffsRemove: string[]，',
    'debuffsAdd: string[]，debuffsRemove: string[]，',
    'alliesAdd: string[]，alliesRemove: string[]，',
    'npcs: { name, status, relation?, location?, notes?, isAlly? }[]，',
    'locations: { name, status, notes? }[]，',
    'threads: { title, status(open/resolved/blocked), notes? }[]，',
    'flags: { key, value }[]，',
    'notesAdd: string[]，',
    'dmNotesAdd: string[]（仅 DM 内部笔记，不对玩家展示），',
    'vitals: { hpCurrent?, hpMax?, sanityCurrent?, sanityMax?, magicCurrent?, magicMax? }，',
    'presence: { location?, scene?, presentNpcsAdd: string[], presentNpcsRemove: string[] }',
    '}。',
    '只记录确定发生的事实；不确定则留空。',
  ].join('\n');

  const userPrompt = [
    `剧本：${script.title}（${script.setting} / 难度：${script.difficulty}）`,
    `角色：${character.name}（${character.occupation}）`,
    `当前装备：${character.inventory.length > 0 ? character.inventory.join('、') : '无'}`,
    `当前 Buff：${character.buffs.length > 0 ? character.buffs.join('、') : '无'}`,
    `当前 Debuff：${character.debuffs.length > 0 ? character.debuffs.join('、') : '无'}`,
    `已有摘要：${memorySummary || '无'}`,
    `世界状态：${memoryStateText || '无'}`,
    '待压缩回合：',
    buildRoundsText(rounds),
    '仅输出 JSON。',
  ].join('\n');

  const messages: AiMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    const result = await generateChatCompletion({
      provider,
      model,
      messages,
      maxOutputTokens: 800,
    });
    const jsonText = extractJson(result.text);
    if (!jsonText) {
      return {
        roundSummaries: createFallbackSummaries(rounds),
        stateDelta: createEmptyMemoryDelta(),
      };
    }
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const roundSummaries = normalizeRoundSummaries(parsed.roundSummaries).filter((summary) =>
      rounds.some((round) => round.round === summary.round),
    );
    const stateDelta = normalizeMemoryDelta(parsed.stateDelta);
    return {
      roundSummaries: roundSummaries.length > 0 ? roundSummaries : createFallbackSummaries(rounds),
      stateDelta,
    };
  } catch (error) {
    console.warn('[memory] 回合压缩失败', error);
    return {
      roundSummaries: createFallbackSummaries(rounds),
      stateDelta: createEmptyMemoryDelta(),
    };
  }
}

export async function mergeLongSummary({
  provider,
  model,
  longSummary,
  overflowSummaries,
}: {
  provider: AiProvider;
  model: string;
  longSummary: string;
  overflowSummaries: GameMemoryRoundSummary[];
}): Promise<string> {
  if (overflowSummaries.length === 0) {
    return longSummary;
  }
  const overflowText = overflowSummaries.map((item) => `回合 ${item.round}：${item.summary}`).join('\n');
  if (!longSummary.trim()) {
    return overflowText;
  }
  const systemPrompt = '你是回合摘要整理器，请将摘要合并为更短的一段话（中文）。';
  const userPrompt = [
    '已有长期摘要：',
    longSummary.trim(),
    '新增摘要：',
    overflowText,
    '请输出合并后的摘要（不超过 6 句）。',
  ].join('\n');
  try {
    const result = await generateChatCompletion({
      provider,
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      maxOutputTokens: 400,
    });
    const text = result.text.trim();
    return text || `${longSummary.trim()}\n${overflowText}`;
  } catch (error) {
    console.warn('[memory] 长期摘要合并失败', error);
    return `${longSummary.trim()}\n${overflowText}`.trim();
  }
}
