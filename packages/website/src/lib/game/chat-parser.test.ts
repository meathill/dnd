import { buildMessageContentFromModules, parseChatModules } from './chat-parser';

describe('parseChatModules', () => {
  it('没有分段时默认叙事模块', () => {
    const result = parseChatModules('雾气弥漫的街道上，你听见远处的铃声。');
    expect(result.modules).toEqual([{ type: 'narrative', content: '雾气弥漫的街道上，你听见远处的铃声。' }]);
    expect(result.content).toBe('雾气弥漫的街道上，你听见远处的铃声。');
  });

  it('可以解析分段输出', () => {
    const result = parseChatModules(`【叙事】
你推开门，一阵冷风扑面而来。
【掷骰】
侦查 1D100 → 37 / 60，成功。`);
    expect(result.modules[0]).toEqual({ type: 'narrative', content: '你推开门，一阵冷风扑面而来。' });
    expect(result.modules[1]).toEqual({ type: 'dice', content: '侦查 1D100 → 37 / 60，成功。' });
    expect(result.modules.length).toBe(2);
  });
});

describe('buildMessageContentFromModules', () => {
  it('会把叙事作为主要内容', () => {
    const content = buildMessageContentFromModules(
      [
        { type: 'narrative', content: '你踏入地下室。' },
        { type: 'dice', content: '聆听 1D100 → 12 / 60，成功。' },
      ],
      '备用文本',
    );
    expect(content).toContain('你踏入地下室。');
    expect(content).toContain('聆听 1D100 → 12 / 60，成功。');
  });
});
