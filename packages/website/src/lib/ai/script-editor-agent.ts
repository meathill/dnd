import { Agent } from '@openai/agents';
import type { ScriptDefinition } from '../game/types';
import { scriptEditorTools } from './script-editor-tools';

export type ScriptEditorAgentContext = {
  script: ScriptDefinition;
};

function buildScriptSnapshot(script: ScriptDefinition): string {
  // 给 AI 一份当前剧本的精简 JSON，作为它提出修改建议时的参考。
  const snapshot = {
    id: script.id,
    title: script.title,
    summary: script.summary,
    setting: script.setting,
    difficulty: script.difficulty,
    background: {
      overview: script.background.overview,
      truth: script.background.truth,
      themes: script.background.themes,
      factions: script.background.factions,
      locations: script.background.locations,
      secrets: script.background.secrets,
    },
    npcProfiles: script.npcProfiles.map((npc) => ({
      id: npc.id,
      name: npc.name,
      role: npc.role,
      type: npc.type,
      summary: npc.summary,
    })),
    scenes: script.scenes.map((scene) => ({
      id: scene.id,
      title: scene.title,
      summary: scene.summary,
      location: scene.location,
    })),
    equipmentOptions: script.equipmentOptions,
    originOptions: script.originOptions,
    buffOptions: script.buffOptions,
    debuffOptions: script.debuffOptions,
  };
  return JSON.stringify(snapshot, null, 2);
}

function buildInstructions(context: ScriptEditorAgentContext): string {
  const snapshot = buildScriptSnapshot(context.script);
  return [
    '你是一名资深 TRPG 剧本编辑助手，擅长 COC（克苏鲁的呼唤）及类似规则。',
    '用户正在编辑一部剧本。你的职责：',
    '1. 读懂用户的需求，判断需要修改剧本的哪一部分。',
    '2. 通过提供的工具（patch_basic / patch_background / patch_npc / remove_npc / patch_scene / remove_scene / patch_options）提出结构化的修改建议。',
    '3. 一次回复里可以调用多次工具；优先用工具落地具体的字段修改，再用自然语言补充解释。',
    '4. 不要编造 id：要更新现有 NPC / 场景时必须使用下方 JSON 里出现过的 id；要新增则省略 id 参数。',
    '5. 如果用户只是提问或讨论，正常用中文回答即可，不需要调用工具。',
    '6. 所有中文描述保持简洁；列表字段提供完整数组而不是拼接字符串。',
    '',
    '当前剧本的结构（JSON 快照）：',
    '```json',
    snapshot,
    '```',
  ].join('\n');
}

export function createScriptEditorAgent(model: string): Agent<ScriptEditorAgentContext> {
  return new Agent<ScriptEditorAgentContext>({
    name: '剧本编辑助手',
    model,
    instructions: (ctx) => buildInstructions(ctx.context),
    tools: scriptEditorTools,
    modelSettings: {
      maxTokens: 1200,
    },
  });
}
