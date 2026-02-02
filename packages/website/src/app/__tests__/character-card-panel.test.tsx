import { act, render, screen } from '@testing-library/react';
import CharacterCardPanel from '../character-card-panel';
import { resetGameStore, useGameStore } from '../../lib/game/game-store';
import type { CharacterRecord } from '../../lib/game/types';

const sampleCharacter: CharacterRecord = {
  id: 'char-1',
  scriptId: 'script-1',
  name: '沈砚',
  occupation: '调查记者',
  age: '31',
  origin: '静默港口',
  appearance: '穿着黑色风衣',
  background: '曾经报道邪教案件的记者。',
  motivation: '拯救被附身的小孩。',
  avatar: 'data:image/png;base64,avatar',
  luck: 55,
  attributes: {
    strength: 55,
    dexterity: 60,
    constitution: 50,
    size: 45,
    intelligence: 70,
    willpower: 65,
    appearance: 40,
    education: 75,
  },
  skills: {
    spotHidden: 60,
    listen: 45,
  },
  inventory: ['左轮手枪', '速记本'],
  buffs: ['灵感加持'],
  debuffs: ['轻微受伤'],
  note: '',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('人物卡面板', () => {
  afterEach(() => {
    act(() => {
      resetGameStore();
    });
  });

  it('根据全局人物卡信息渲染内容', () => {
    act(() => {
      useGameStore.setState({ character: sampleCharacter });
    });

    render(
      <CharacterCardPanel
        skillOptions={[
          { id: 'spotHidden', label: '侦查', group: '调查' },
          { id: 'listen', label: '聆听', group: '调查' },
        ]}
        rules={{}}
      />,
    );

    expect(screen.getByText('沈砚')).toBeInTheDocument();
    expect(screen.getByText(/调查记者/)).toBeInTheDocument();
    expect(screen.getByText('侦查 60')).toBeInTheDocument();
    expect(screen.getByText('左轮手枪')).toBeInTheDocument();
    expect(screen.getByText('灵感加持')).toBeInTheDocument();
    expect(screen.getByText('9 / 9')).toBeInTheDocument();
    expect(screen.getByText('55 / 55')).toBeInTheDocument();
    expect(screen.getByAltText('沈砚 头像')).toBeInTheDocument();
  });

  it('会使用记忆中的状态覆盖生命理智数值', () => {
    act(() => {
      useGameStore.setState({
        character: sampleCharacter,
        memory: {
          vitals: {
            hp: { current: 4, max: 9 },
            sanity: { current: 42, max: 65 },
          },
          presence: { presentNpcs: [] },
          mapText: '',
          locations: [],
        },
      });
    });

    render(<CharacterCardPanel />);

    expect(screen.getByText('4 / 9')).toBeInTheDocument();
    expect(screen.getByText('42 / 65')).toBeInTheDocument();
  });

  it('没有人物卡时显示占位提示', () => {
    render(<CharacterCardPanel />);

    expect(screen.getByText('尚未创建人物卡')).toBeInTheDocument();
  });
});
