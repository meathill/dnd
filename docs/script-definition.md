# 剧本数据结构说明

## 目标
- 剧本是游戏核心数据，决定角色卡可选项、场景、遭遇与 DM 引导内容。
- 部分字段为 DM 隐藏信息，不直接展示给玩家，只在叙事中逐步揭示。

## ScriptDefinition 字段

### 基础信息
- id: 剧本唯一标识
- title: 标题
- summary: 一句话概述
- setting: 时代/地点/氛围
- difficulty: 难度标签
- openingMessages: 开场对白（system/dm/player）

### 角色卡与选项
- skillOptions: 可选技能（id/label/group）
- equipmentOptions: 可选装备
- occupationOptions: 职业选项
- originOptions: 出身/籍贯选项
- buffOptions / debuffOptions: 可选增益/减益
- attributeRanges: 属性范围（可选）
- attributePointBudget: 属性点总上限
- skillLimit / equipmentLimit / buffLimit / debuffLimit: 选择数量上限

### 规则覆盖（房规）
- rules: ScriptRuleOverrides（默认 DC、技能预算、快速分配规则等）
- 规则优先级：房规（剧本） > 规则书 > 情境裁定

### 场景与遭遇（对玩家可见）
- scenes: 场景列表（id/title/summary/location/hooks）
- encounters: 遭遇列表（id/title/summary/enemies/danger）

### DM 隐藏信息（不展示给玩家）
- background: 背景真相与隐藏要素
  - overview / truth / themes / factions / locations / secrets
- storyArcs: 故事走向与揭示节奏
  - id / title / summary / beats / reveals
- enemyProfiles: 敌人设定（用于平衡与判定）
  - 生命、攻击、技能、战术、弱点、理智损失等

## 数据示例（精简）

```ts
const script = {
  id: 'script-demo',
  title: '示例剧本',
  summary: '一段短简介。',
  setting: '现代 · 雨夜',
  difficulty: '中低',
  openingMessages: [],
  background: {
    overview: '表面故事。',
    truth: '真实缘由。',
    themes: ['交易', '恐惧'],
    factions: ['装修工作室', '物业'],
    locations: ['工作室', '凶宅'],
    secrets: ['隐藏利益链'],
  },
  storyArcs: [
    {
      id: 'arc-entry',
      title: '入门试炼',
      summary: '完成首次勘察。',
      beats: ['进入现场', '发现异常'],
      reveals: ['业务真相'],
    },
  ],
  enemyProfiles: [
    {
      id: 'enemy-1',
      name: '残留怨灵',
      type: '灵体',
      threat: '中',
      summary: '由怨念凝成。',
      hp: 10,
      attacks: [{ name: '寒意侵袭', chance: 35, damage: '1D4' }],
      skills: [{ name: '恐吓', value: 50 }],
      traits: ['畏火'],
      tactics: '先驱散再逼退。',
      weakness: '明火与符纸',
      sanityLoss: '0/1D4',
    },
  ],
};
```
