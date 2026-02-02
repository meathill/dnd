import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SceneMapPanel from '../scene-map-panel';
import { resetGameStore, useGameStore } from '../../lib/game/game-store';
import type { ScriptDefinition } from '../../lib/game/types';

const sampleScript: ScriptDefinition = {
  id: 'script-map',
  title: '地图测试',
  summary: '测试',
  setting: '现代',
  difficulty: '低',
  openingMessages: [],
  background: {
    overview: '',
    truth: '',
    themes: [],
    factions: [],
    locations: [],
    explorableAreas: [
      {
        id: 'area-1',
        name: '旧宅院子',
        summary: '暴雨冲刷的碎符。',
        description: '围栏残破，泥地上还能看见符纸灰。',
      },
    ],
    secrets: [],
  },
  storyArcs: [],
  npcProfiles: [],
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
  scenes: [],
  encounters: [],
};

describe('全局地图面板', () => {
  afterEach(() => {
    act(() => {
      resetGameStore();
    });
  });

  it('展示可探索区域与状态', async () => {
    act(() => {
      useGameStore.setState({
        memory: {
          vitals: {},
          presence: { presentNpcs: [] },
          mapText: '',
          locations: [{ name: '旧宅院子', status: '已探索' }],
        },
      });
    });

    render(<SceneMapPanel script={sampleScript} />);

    expect(screen.getByText('旧宅院子')).toBeInTheDocument();
    expect(screen.getByText('已探索')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText('旧宅院子'));

    expect(await screen.findByText('预设描述')).toBeInTheDocument();
    expect(screen.getByText('围栏残破，泥地上还能看见符纸灰。')).toBeInTheDocument();
  });
});
