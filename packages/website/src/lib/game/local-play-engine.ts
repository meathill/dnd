import { DEFAULT_CHECK_DC } from './rules';
import { executeActionPlan } from './action-executor';
import { createEmptyMemoryState, buildMemorySnapshot } from './memory';
import type { CharacterRecord, ChatMessage, ChatModule, GameMemorySnapshot, ScriptDefinition } from './types';
import type { LocalPlaySendResult } from './local-play-types';

type SimpleIntent = 'dialogue' | 'investigation' | 'combat' | 'skill' | 'move';

function formatTimeValue(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function createMessage(role: 'dm' | 'player' | 'system', content: string, modules?: ChatModule[]): ChatMessage {
  const now = new Date();
  return {
    id: `${role}-${now.getTime()}-${Math.round(Math.random() * 1000)}`,
    role,
    speaker: role === 'dm' ? '肉团长' : role === 'player' ? '玩家' : '系统',
    time: formatTimeValue(now),
    content,
    ...(modules ? { modules } : {}),
  };
}

function resolveSceneByInput(script: ScriptDefinition, input: string): ScriptDefinition['scenes'][number] | null {
  const lowered = input.toLowerCase();
  const matchedScene = script.scenes.find((scene) => {
    const terms = [scene.title, scene.summary, scene.location, ...scene.hooks].join(' ').toLowerCase();
    return lowered && (lowered.includes(scene.title.toLowerCase()) || terms.includes(lowered));
  });
  return matchedScene ?? script.scenes[0] ?? null;
}

function resolveAreaByScene(script: ScriptDefinition, scene: ScriptDefinition['scenes'][number] | null) {
  if (!scene) {
    return script.background.explorableAreas[0] ?? null;
  }
  const matchedArea = script.background.explorableAreas.find((area) => {
    const haystack = [area.name, area.summary, area.description].join(' ').toLowerCase();
    return haystack.includes(scene.location.toLowerCase()) || haystack.includes(scene.title.toLowerCase());
  });
  return matchedArea ?? script.background.explorableAreas[0] ?? null;
}

function detectIntent(input: string): SimpleIntent {
  if (/(攻击|开枪|射击|挥拳|格斗|砍|冲上去)/.test(input)) {
    return 'combat';
  }
  if (/(观察|调查|搜索|侦查|聆听|寻找|查看|翻找|检查)/.test(input)) {
    return 'investigation';
  }
  if (/(说服|安抚|交涉|询问|对话|沟通|劝|问)/.test(input)) {
    return 'dialogue';
  }
  if (/(潜行|开锁|急救|神秘学|心理学|说服|聆听|侦查|格斗|枪械)/.test(input)) {
    return 'skill';
  }
  return 'move';
}

function buildHeuristicAnalysis(input: string) {
  const intent = detectIntent(input);
  if (intent === 'combat') {
    return {
      allowed: true,
      reason: '',
      intent: 'combat' as const,
      needsDice: true,
      diceType: 'combat' as const,
      diceTarget: /(枪|射击|开枪)/.test(input) ? '枪械' : '格斗',
      difficulty: 'normal' as const,
      tags: ['local-fallback', 'combat'],
      actions: [
        {
          type: 'attack' as const,
          target: '当前威胁',
          skill: /(枪|射击|开枪)/.test(input) ? '枪械' : '格斗',
          dc: DEFAULT_CHECK_DC,
          difficulty: 'normal' as const,
          reason: '玩家选择直接冲突。',
        },
      ],
    };
  }
  if (intent === 'investigation') {
    return {
      allowed: true,
      reason: '',
      intent: 'investigation' as const,
      needsDice: true,
      diceType: 'skill' as const,
      diceTarget: /(听|聆听)/.test(input) ? '聆听' : '侦查',
      difficulty: 'normal' as const,
      tags: ['local-fallback', 'investigation'],
      actions: [
        {
          type: 'check' as const,
          checkType: 'skill' as const,
          target: /(听|聆听)/.test(input) ? '聆听' : '侦查',
          dc: DEFAULT_CHECK_DC,
          difficulty: 'normal' as const,
          reason: '玩家正在主动调查环境。',
        },
      ],
    };
  }
  if (intent === 'dialogue') {
    return {
      allowed: true,
      reason: '',
      intent: 'dialogue' as const,
      needsDice: true,
      diceType: 'skill' as const,
      diceTarget: '说服',
      difficulty: 'normal' as const,
      tags: ['local-fallback', 'dialogue'],
      actions: [
        {
          type: 'check' as const,
          checkType: 'skill' as const,
          target: '说服',
          dc: DEFAULT_CHECK_DC,
          difficulty: 'normal' as const,
          reason: '玩家正在尝试通过语言推动局势。',
        },
      ],
    };
  }
  if (intent === 'skill') {
    const target = /(神秘学)/.test(input)
      ? '神秘学'
      : /(心理学)/.test(input)
        ? '心理学'
        : /(开锁)/.test(input)
          ? '开锁'
          : /(潜行)/.test(input)
            ? '潜行'
            : /(急救)/.test(input)
              ? '急救'
              : '侦查';
    return {
      allowed: true,
      reason: '',
      intent: 'skill' as const,
      needsDice: true,
      diceType: 'skill' as const,
      diceTarget: target,
      difficulty: 'normal' as const,
      tags: ['local-fallback', 'skill'],
      actions: [
        {
          type: 'check' as const,
          checkType: 'skill' as const,
          target,
          dc: DEFAULT_CHECK_DC,
          difficulty: 'normal' as const,
          reason: '玩家明确点名了技能行动。',
        },
      ],
    };
  }
  return {
    allowed: true,
    reason: '',
    intent: 'action' as const,
    needsDice: false,
    diceType: 'none' as const,
    diceTarget: '',
    difficulty: 'normal' as const,
    tags: ['local-fallback', 'move'],
    actions: [],
  };
}

function buildNarration(params: {
  script: ScriptDefinition;
  input: string;
  actionSummary: string;
  sceneTitle: string;
  areaSummary: string;
}): string {
  const { script, input, actionSummary, sceneTitle, areaSummary } = params;
  const hooks =
    script.scenes
      .find((scene) => scene.title === sceneTitle)
      ?.hooks.slice(0, 2)
      .join('、') ?? '周围异样';
  if (actionSummary) {
    return `${sceneTitle}里，${areaSummary}。\n你提出“${input}”。\n系统裁定：${actionSummary}。\n现场因此出现了新的可追踪变化，你可以继续围绕${hooks}推进。`;
  }
  return `${sceneTitle}里，${areaSummary}。\n你提出“${input}”。\n这一步没有触发明确检定，但局势被推动了。接下来可以围绕${hooks}继续行动。`;
}

export function buildInitialLocalMessages(script: ScriptDefinition): ChatMessage[] {
  return script.openingMessages.map((message, index) => ({
    id: `local-opening-${index}`,
    role: message.role,
    speaker: message.speaker || (message.role === 'dm' ? '肉团长' : message.role === 'player' ? '玩家' : '系统'),
    time: index === 0 ? '开场' : '开场',
    content: message.content,
  }));
}

export function buildInitialLocalMemory(
  script: ScriptDefinition,
  character: CharacterRecord | null,
): GameMemorySnapshot {
  const state = createEmptyMemoryState();
  const firstScene = script.scenes[0];
  const firstArea = script.background.explorableAreas[0];
  if (character) {
    const hitPoints = Math.max(
      1,
      Math.floor(((character.attributes.constitution ?? 0) + (character.attributes.size ?? 0)) / 10),
    );
    const sanity = Math.max(0, Math.floor(character.attributes.willpower ?? 0));
    const magic = Math.max(0, Math.floor((character.attributes.willpower ?? 0) / 5));
    state.vitals = {
      hp: { current: hitPoints, max: hitPoints },
      sanity: { current: sanity, max: sanity },
      magic: { current: magic, max: magic },
    };
  }
  if (firstScene) {
    state.presence.scene = firstScene.title;
    state.presence.location = firstScene.location;
  }
  if (firstArea) {
    state.locations = script.background.explorableAreas.map((area, index) => ({
      name: area.name,
      status: index === 0 ? '已探索' : '未探索',
      notes: area.summary,
    }));
    state.mapText = script.background.explorableAreas
      .map((area, index) => `${index === 0 ? '>>' : '--'} ${area.name}：${index === 0 ? '当前线索区' : area.summary}`)
      .join('\n');
  }
  return buildMemorySnapshot(state);
}

export function runLocalPlayTurn(params: {
  script: ScriptDefinition;
  character: CharacterRecord;
  input: string;
  previousMessages: ChatMessage[];
  previousMemory: GameMemorySnapshot | null;
  randomFn?: () => number;
}): LocalPlaySendResult {
  const { script, character, input, previousMessages, previousMemory, randomFn } = params;
  const content = input.trim();
  if (!content) {
    return {
      messages: previousMessages,
      memory: previousMemory ?? buildInitialLocalMemory(script, character),
    };
  }

  const analysis = buildHeuristicAnalysis(content);
  const execution = executeActionPlan({ analysis, script, character, randomFn });
  const activeScene = resolveSceneByInput(script, content);
  const activeArea = resolveAreaByScene(script, activeScene);
  const playerMessage = createMessage('player', content);
  const narrationText = buildNarration({
    script,
    input: content,
    actionSummary: execution.summary,
    sceneTitle: activeScene?.title ?? '未知场景',
    areaSummary: activeArea?.description ?? activeScene?.summary ?? '周围仍旧压抑而安静',
  });
  const dmMessage = createMessage('dm', narrationText, [
    ...(execution.modules.length > 0 ? execution.modules : []),
    { type: 'narrative', content: narrationText },
  ]);
  const nextMessages = [...previousMessages, playerMessage, dmMessage];

  const baseMemory = previousMemory ?? buildInitialLocalMemory(script, character);
  const nextLocations = script.background.explorableAreas.map((area) => {
    if (activeArea && area.id === activeArea.id) {
      return { name: area.name, status: '已探索', notes: area.summary };
    }
    const previous = baseMemory.locations.find((item) => item.name === area.name);
    return previous ?? { name: area.name, status: '未探索', notes: area.summary };
  });
  const mapText = script.background.explorableAreas
    .map((area) => {
      const isActive = activeArea?.id === area.id;
      const location = nextLocations.find((item) => item.name === area.name);
      return `${isActive ? '>>' : '--'} ${area.name}：${location?.status ?? '未探索'}`;
    })
    .join('\n');

  const memory: GameMemorySnapshot = {
    vitals: baseMemory.vitals,
    presence: {
      location: activeArea?.name ?? baseMemory.presence.location,
      scene: activeScene?.title ?? baseMemory.presence.scene,
      presentNpcs: activeScene
        ? script.npcProfiles
            .filter((npc) => npc.useWhen.includes(activeScene.title) || npc.summary.includes(activeScene.title))
            .map((npc) => npc.name)
        : baseMemory.presence.presentNpcs,
    },
    mapText,
    locations: nextLocations,
  };

  return { messages: nextMessages, memory };
}
