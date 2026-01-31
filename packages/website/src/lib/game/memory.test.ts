import {
  applyMemoryDelta,
  buildShortSummary,
  createEmptyMemoryDelta,
  createEmptyMemoryState,
  parseMemoryState,
} from './memory';

describe('memory', () => {
  it('applyMemoryDelta 会合并盟友与 NPC', () => {
    const state = createEmptyMemoryState();
    const delta = {
      ...createEmptyMemoryDelta(),
      alliesAdd: ['玛丽'],
      npcs: [{ name: '玛丽', status: '愿意协助', relation: '友好' }],
      flags: [{ key: '大门', value: '已破坏' }],
    };
    const next = applyMemoryDelta(state, delta);
    expect(next.allies).toContain('玛丽');
    expect(next.npcs[0]?.name).toBe('玛丽');
    expect(next.flags[0]?.key).toBe('大门');
  });

  it('applyMemoryDelta 会更新状态与 DM 笔记', () => {
    const state = createEmptyMemoryState();
    const delta = {
      ...createEmptyMemoryDelta(),
      vitals: { hpCurrent: 6, hpMax: 10, sanityCurrent: 40, sanityMax: 60 },
      presence: { location: '教堂', scene: '地下室', presentNpcsAdd: ['附身孩童'], presentNpcsRemove: [] },
      dmNotesAdd: ['地下室墙体有裂痕'],
    };
    const next = applyMemoryDelta(state, delta);
    expect(next.vitals.hp?.current).toBe(6);
    expect(next.vitals.hp?.max).toBe(10);
    expect(next.vitals.sanity?.current).toBe(40);
    expect(next.presence.location).toBe('教堂');
    expect(next.presence.presentNpcs).toContain('附身孩童');
    expect(next.dmNotes).toContain('地下室墙体有裂痕');
  });

  it('buildShortSummary 会排除最近回合', () => {
    const longSummary = '早期摘要';
    const recentRounds = [
      { round: 1, summary: '第一回合' },
      { round: 2, summary: '第二回合' },
      { round: 3, summary: '第三回合' },
      { round: 4, summary: '第四回合' },
      { round: 5, summary: '第五回合' },
    ];
    const summary = buildShortSummary(longSummary, recentRounds, 3);
    expect(summary).toContain('早期摘要');
    expect(summary).toContain('第一回合');
    expect(summary).toContain('第二回合');
    expect(summary).not.toContain('第四回合');
    expect(summary).not.toContain('第五回合');
  });

  it('parseMemoryState 遇到非法 JSON 返回空状态', () => {
    const state = parseMemoryState('not-json');
    expect(state.allies.length).toBe(0);
    expect(state.npcs.length).toBe(0);
  });
});
