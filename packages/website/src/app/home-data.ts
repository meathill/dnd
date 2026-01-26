import type { ChatMessage } from '../lib/game/types';

export type StatTone = 'moss' | 'brass' | 'ember' | 'river';

export type Stat = {
  label: string;
  value: number;
  max: number;
  tone: StatTone;
};

export type Attribute = {
  label: string;
  value: number;
};

export type Skill = {
  label: string;
  value: number;
};

export type MapNodeStatus = 'current' | 'known' | 'unknown';

export type MapNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  status: MapNodeStatus;
};

export const stats: Stat[] = [
  { label: '生命值', value: 12, max: 14, tone: 'ember' },
  { label: '理智值', value: 58, max: 75, tone: 'moss' },
  { label: '魔法值', value: 9, max: 12, tone: 'river' },
  { label: '幸运值', value: 43, max: 60, tone: 'brass' },
];

export const attributes: Attribute[] = [
  { label: '力量', value: 55 },
  { label: '敏捷', value: 60 },
  { label: '体质', value: 50 },
  { label: '体型', value: 45 },
  { label: '智力', value: 70 },
  { label: '意志', value: 65 },
  { label: '外貌', value: 40 },
  { label: '教育', value: 75 },
];

export const skills: Skill[] = [
  { label: '侦查', value: 65 },
  { label: '图书馆', value: 60 },
  { label: '说服', value: 50 },
  { label: '心理学', value: 45 },
];

export const inventory: string[] = ['黑色风衣', '左轮手枪', '速记本', '银质怀表', '空心弹夹'];

export const buffs: string[] = ['灵感加持', '冷静分析'];

export const debuffs: string[] = ['轻微受伤', '噩梦缠身'];

export const chatMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'dm',
    speaker: '肉团长',
    time: '19:40',
    content:
      '雨雾从码头的栈桥升起，你的皮鞋踩在湿木板上，发出低沉的回响。\n旅店的灯光在雾里被拉长成碎片，像某种不安的暗号。',
  },
  {
    id: 'm2',
    role: 'player',
    speaker: '玩家 · 沈砚',
    time: '19:41',
    content: '我先观察旅店窗户的光影，然后靠近门口听一听里面的动静。',
  },
  {
    id: 'm3',
    role: 'system',
    speaker: '系统',
    time: '19:41',
    content: '判定：侦查 1D100 → 37 / 65，成功。',
  },
  {
    id: 'm4',
    role: 'dm',
    speaker: '肉团长',
    time: '19:42',
    content: '窗内的灯光略微晃动，有人提起杯子又放下，金属碰撞声很轻。你察觉到门后有一道缓慢的呼吸声。',
  },
];

export const quickActions: string[] = ['观察周围', '整理线索', '请求掷骰', '记录手帐', '切换视角'];

export const mapNodes: MapNode[] = [
  { id: 'inn', name: '河口旅店', x: 24, y: 18, status: 'current' },
  { id: 'dock', name: '旧码头', x: 70, y: 26, status: 'known' },
  { id: 'market', name: '雾市集', x: 58, y: 62, status: 'known' },
  { id: 'alley', name: '栈桥小巷', x: 30, y: 58, status: 'known' },
  { id: 'lighthouse', name: '白塔灯室', x: 82, y: 12, status: 'unknown' },
  { id: 'archive', name: '旧档案馆', x: 12, y: 52, status: 'known' },
];

export const sceneFacts: { label: string; value: string }[] = [
  { label: '地点', value: '静默港口 · 河口旅店' },
  { label: '时间', value: '1923/11/12 19:42' },
  { label: '天气', value: '小雨 · 海雾' },
  { label: '可疑目标', value: '旅店内低语声' },
];

export const sceneClues: string[] = [
  '窗内灯光晃动，疑似有人停留。',
  '门后呼吸平稳，暂不确定人数。',
  '港口雾气过于浓重，视距下降。',
];
