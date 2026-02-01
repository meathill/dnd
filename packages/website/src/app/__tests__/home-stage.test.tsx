import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import HomeStage from '../home-stage';
import type { ScriptDefinition } from '../../lib/game/types';

const sampleScript: ScriptDefinition = {
  id: 'script-1',
  title: '风暴旧宅',
  summary: '暴雨夜的驱邪行动。',
  setting: '现代',
  difficulty: '中等',
  openingMessages: [],
  background: {
    overview: '',
    truth: '',
    themes: [],
    factions: [],
    locations: [],
    secrets: [],
  },
  storyArcs: [],
  enemyProfiles: [],
  skillOptions: [],
  equipmentOptions: [],
  occupationOptions: [],
  originOptions: [],
  buffOptions: [],
  debuffOptions: [],
  attributeRanges: {},
  attributePointBudget: 0,
  skillLimit: 0,
  equipmentLimit: 0,
  buffLimit: 0,
  debuffLimit: 0,
  rules: {},
  scenes: [{ id: 'scene-1', title: '旧宅门厅', summary: '破门而入。', location: '门厅', hooks: [] }],
  encounters: [{ id: 'encounter-1', title: '邪灵现身', summary: '紧张战斗。', enemies: [], danger: '高' }],
};

describe('首页面板', () => {
  it('点击剧本会触发回调', async () => {
    const user = userEvent.setup();
    const handleSelectScript = vi.fn();

    render(<HomeStage scripts={[sampleScript]} onSelectScript={handleSelectScript} />);

    await user.click(screen.getByRole('button', { name: '查看剧本' }));
    expect(handleSelectScript).toHaveBeenCalledWith('script-1');
  });
});
