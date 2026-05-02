import { describe, expect, it } from 'vitest';
import { buildDefaultFormState } from '@/app/character-creator-data';
import {
  buildCharacterRecordFromForm,
  buildDefaultLocalScript,
  buildInitialLocalMemory,
  buildInitialLocalMessages,
  exportLocalPlayAsJson,
  exportLocalPlayAsMarkdown,
  runLocalPlayTurn,
} from './local-play';

describe('local play', () => {
  it('buildCharacterRecordFromForm 会转换库存文本并保留 scriptId', () => {
    const form = buildDefaultFormState();
    form.inventory = '手电筒、盐, 录音机';

    const character = buildCharacterRecordFromForm(form, 'local-script');

    expect(character.scriptId).toBe('local-script');
    expect(character.inventory).toEqual(['手电筒', '盐', '录音机']);
  });

  it('runLocalPlayTurn 会追加玩家与 DM 消息，并更新地图状态', () => {
    const script = buildDefaultLocalScript();
    const form = buildDefaultFormState({
      skillOptions: script.skillOptions,
      occupationOptions: script.occupationOptions,
      originOptions: script.originOptions,
      buffOptions: script.buffOptions,
      debuffOptions: script.debuffOptions,
      attributePointBudget: script.attributePointBudget,
      rules: script.rules,
    });
    const character = buildCharacterRecordFromForm(form, script.id);
    const initialMessages = buildInitialLocalMessages(script);
    const initialMemory = buildInitialLocalMemory(script, character);

    const result = runLocalPlayTurn({
      script,
      character,
      input: '我先观察铁门附近的脚印。',
      previousMessages: initialMessages,
      previousMemory: initialMemory,
      randomFn: () => 0.2,
    });

    expect(result.messages).toHaveLength(initialMessages.length + 2);
    expect(result.messages.at(-2)?.role).toBe('player');
    expect(result.messages.at(-1)?.role).toBe('dm');
    expect(result.messages.at(-1)?.modules?.some((module) => module.type === 'dice')).toBe(true);
    expect(result.memory.mapText).toContain('冷库外码头');
  });

  it('导出函数会生成可读 Markdown 和 JSON', () => {
    const script = buildDefaultLocalScript();
    const form = buildDefaultFormState({
      skillOptions: script.skillOptions,
      occupationOptions: script.occupationOptions,
      originOptions: script.originOptions,
      buffOptions: script.buffOptions,
      debuffOptions: script.debuffOptions,
      attributePointBudget: script.attributePointBudget,
      rules: script.rules,
    });
    const character = buildCharacterRecordFromForm(form, script.id);
    const messages = buildInitialLocalMessages(script);
    const memory = buildInitialLocalMemory(script, character);

    const markdown = exportLocalPlayAsMarkdown({ script, character, messages, memory });
    const json = exportLocalPlayAsJson({ script, character, messages, memory });

    expect(markdown).toContain(`# ${script.title} 本地战报`);
    expect(markdown).toContain('## 对话记录');
    expect(json).toContain(`"title": "${script.title}"`);
    expect(json).toContain(`"name": "${character.name}"`);
  });
});
