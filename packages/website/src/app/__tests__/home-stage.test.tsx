import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeStage from '../home-stage';
import type { GameRecordSummary, ScriptDefinition } from '../../lib/game/types';

const sampleScript: ScriptDefinition = {
  id: 'script-1',
  title: '风暴旧宅',
  summary: '暴雨夜的驱邪行动。',
  setting: '现代',
  difficulty: '中等',
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
  scenes: [{ id: 'scene-1', title: '旧宅门厅', summary: '破门而入。', location: '门厅', hooks: [] }],
  encounters: [{ id: 'encounter-1', title: '邪灵现身', summary: '紧张战斗。', enemies: [], danger: '高' }],
};

const sampleGame: GameRecordSummary = {
  id: 'game-1',
  scriptId: 'script-1',
  scriptTitle: '风暴旧宅',
  characterId: 'char-1',
  characterName: '沈砚',
  status: 'active',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('首页面板', () => {
  it('点击剧本与继续游戏会触发回调', async () => {
    const user = userEvent.setup();
    const handleSelectScript = vi.fn();
    const handleContinueGame = vi.fn();

    render(
      <HomeStage
        scripts={[sampleScript]}
        games={[sampleGame]}
        onSelectScript={handleSelectScript}
        onContinueGame={handleContinueGame}
      />,
    );

    await user.click(screen.getByRole('button', { name: '查看剧本' }));
    expect(handleSelectScript).toHaveBeenCalledWith('script-1');

    await user.click(screen.getByRole('button', { name: '继续游戏' }));
    expect(handleContinueGame).toHaveBeenCalledWith('game-1');
  });

  it('显示游戏记录提示信息', () => {
    render(
      <HomeStage
        scripts={[sampleScript]}
        games={[]}
        onSelectScript={() => {}}
        onContinueGame={() => {}}
        gamesMessage="登录后可查看游戏记录。"
      />,
    );

    expect(screen.getByText('登录后可查看游戏记录。')).toBeInTheDocument();
  });
});
