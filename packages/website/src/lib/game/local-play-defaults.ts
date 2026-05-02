import type { FormState } from '@/app/character-creator-data';
import { buildScriptDefinition, buildScriptDraft } from '@/app/admin/scripts/[id]/script-editor-mappers';
import type { ScriptDraft } from '@/app/admin/scripts/[id]/script-editor-types';
import type { CharacterRecord, ScriptDefinition } from './types';

const DEFAULT_LOCAL_PLAY_DRAFT = {
  id: 'local-coc-module',
  title: '本地测试模组',
  summary: '一条可直接在浏览器本地测试的 COC 新手模组。',
  setting: '1996 年沿海小镇',
  difficulty: '中等',
  openingMessages: [
    {
      role: 'system',
      speaker: '',
      content: '本地模式已启动。你可以先调整模组，再创建角色并直接游玩。',
    },
    {
      role: 'dm',
      speaker: '肉团长',
      content: '夜色压在港口上，废弃冷库外的潮气里混着铁锈味。有人说，昨晚这里传出了不属于活人的敲门声。',
    },
  ],
  background: {
    overview: '渔港冷库近来传出怪声，码头工人接连失踪。',
    truth: '冷库地下的私藏祭坛唤醒了一个低阶怨灵，失踪者正被邪教徒用于补全失败仪式。',
    themesText: '潮湿恐惧\n失踪案件\n失败仪式',
    factionsText: '码头工会\n本地神父\n潜伏邪教徒',
    locationsText: '废弃冷库\n码头办公室\n地下祭坛',
    secretsText: '失踪者并未全部死亡\n敲门声来自被困的幸存者\n怨灵畏惧盐与强光',
  },
  storyArcs: [
    {
      id: 'arc-entry',
      title: '接近冷库',
      summary: '先从外围获得线索，再决定潜入方式。',
      beatsText: '调查码头\n找到入口\n确认有人活动',
      revealsText: '冷库并非完全废弃\n敲门声有节律',
    },
    {
      id: 'arc-ritual',
      title: '中断仪式',
      summary: '在地下祭坛阻止怨灵继续壮大。',
      beatsText: '发现祭坛\n面对邪教徒\n处理怨灵',
      revealsText: '仪式尚未完成\n幸存者仍可救出',
    },
  ],
  npcProfiles: [
    {
      id: 'npc-father-lin',
      name: '林神父',
      type: '神职人员',
      role: 'ally',
      threat: '低',
      summary: '掌握部分旧仪式知识，但不敢独自进入冷库。',
      useWhen: '玩家想了解异常事件或获取驱散建议时',
      status: '焦虑但愿意合作',
      hp: '10',
      armor: '',
      move: '',
      attacksText: '',
      skillsText: '神秘学 | 55\n说服 | 50',
      traitsText: '熟悉本地传闻\n提供盐与蜡烛',
      tactics: '尽量让调查员避免正面硬拼。',
      weakness: '非常害怕直接接触超自然现象。',
      sanityLoss: '0/0',
    },
  ],
  skillOptionsText:
    'spotHidden | 侦查 | 调查\nlisten | 聆听 | 调查\noccult | 神秘学 | 学识\npsychology | 心理学 | 学识\npersuade | 说服 | 社交\nstealth | 潜行 | 行动\nlocksmith | 开锁 | 行动\nbrawl | 格斗 | 战斗\nfirearms | 枪械 | 战斗\nfirstAid | 急救 | 学识',
  equipmentOptionsText: '手电筒\n录音机\n撬棍\n盐\n蜡烛\n左轮手枪\n急救包\n绳索',
  occupationOptions: [
    {
      id: 'occupation-reporter',
      name: '记者',
      summary: '擅长追线索与访问。',
      skillIdsText: 'spotHidden\npsychology\npersuade',
      equipmentText: '录音机\n手电筒',
    },
    {
      id: 'occupation-detective',
      name: '私家侦探',
      summary: '擅长潜入、观察与应对冲突。',
      skillIdsText: 'spotHidden\nstealth\nlocksmith',
      equipmentText: '撬棍\n手电筒',
    },
    {
      id: 'occupation-priest',
      name: '神父',
      summary: '擅长安抚与仪式协助。',
      skillIdsText: 'occult\npersuade\npsychology',
      equipmentText: '盐\n蜡烛',
    },
  ],
  originOptionsText: '港口区\n教堂区\n旧市场',
  buffOptionsText: '灵感加持\n沉着冷静\n仪式专注',
  debuffOptionsText: '',
  explorableAreas: [
    {
      id: 'area-dock',
      name: '冷库外码头',
      summary: '风很大，地上有拖拽痕迹。',
      description: '铁门半掩，潮湿木箱边有混乱脚印和被踢翻的煤油灯。',
      dmNotes: '侦查可发现通往侧门的路线。',
    },
    {
      id: 'area-office',
      name: '冷库办公室',
      summary: '账本、钥匙和未写完的值班记录。',
      description: '桌面布满水渍，一本登记册停留在昨晚的失踪班次。',
      dmNotes: '可提供钥匙与失踪者名字。',
    },
    {
      id: 'area-basement',
      name: '地下祭坛',
      summary: '潮气与血腥味最重的地方。',
      description: '盐圈被破坏，蜡烛只剩几支还在燃烧，远处传来断续呻吟。',
      dmNotes: '高潮场景，怨灵与邪教徒都在这里。',
    },
  ],
  attributeRanges: {
    strength: { min: '20', max: '80' },
    dexterity: { min: '20', max: '80' },
    constitution: { min: '20', max: '80' },
    size: { min: '40', max: '85' },
    intelligence: { min: '40', max: '85' },
    willpower: { min: '30', max: '85' },
    appearance: { min: '15', max: '80' },
    education: { min: '40', max: '85' },
  },
  attributePointBudget: '0',
  skillLimit: '4',
  equipmentLimit: '4',
  buffLimit: '1',
  debuffLimit: '0',
  rules: {
    defaultCheckDc: '',
    checkDcOverridesText: '',
    skillValueTrained: '',
    skillValueUntrained: '',
    skillPointBudget: '0',
    skillMaxValue: '',
    skillBaseValuesText: '',
    skillAllocationMode: 'selection',
    quickstartCoreValuesText: '',
    quickstartInterestCount: '',
    quickstartInterestBonus: '',
  },
  scenes: [
    {
      id: 'scene-approach',
      title: '靠近冷库',
      summary: '先从外围观察、访问或寻找入口。',
      location: '冷库外码头',
      hooksText: '拖拽痕迹\n拍门声\n巡逻影子',
    },
    {
      id: 'scene-office',
      title: '办公室取证',
      summary: '可以拿到账本、钥匙和失踪者线索。',
      location: '冷库办公室',
      hooksText: '登记册\n钥匙串\n求救纸条',
    },
    {
      id: 'scene-basement',
      title: '地下祭坛',
      summary: '面对仪式残留、幸存者和怨灵。',
      location: '地下祭坛',
      hooksText: '盐圈\n蜡烛\n呻吟声',
    },
  ],
  encounters: [
    {
      id: 'encounter-cultist',
      title: '看守邪教徒',
      summary: '侧门和地下入口都有低阶看守。',
      npcsText: '低阶邪教徒 x2',
      danger: '中',
    },
    {
      id: 'encounter-spirit',
      title: '低阶怨灵显形',
      summary: '仪式被打断后，怨灵会在祭坛附近显形。',
      npcsText: '低阶怨灵 x1',
      danger: '高',
    },
  ],
} satisfies ScriptDraft;

function nowIso(): string {
  return new Date().toISOString();
}

function splitInventoryText(value: string): string[] {
  return value
    .replace(/[、，,]/g, '\n')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildDefaultLocalScript(): ScriptDefinition {
  return buildScriptDefinition(DEFAULT_LOCAL_PLAY_DRAFT);
}

export function buildLocalScriptDraft(script: ScriptDefinition = buildDefaultLocalScript()) {
  return buildScriptDraft(script);
}

export function buildCharacterRecordFromForm(
  formState: FormState,
  scriptId: string,
  currentCharacter?: CharacterRecord | null,
): CharacterRecord {
  const timestamp = nowIso();
  return {
    id: currentCharacter?.id ?? `local-character-${crypto.randomUUID()}`,
    scriptId,
    name: formState.name.trim() || '未命名调查员',
    occupation: formState.occupation.trim() || '未知职业',
    age: formState.age.trim(),
    origin: formState.origin.trim(),
    appearance: formState.appearance.trim(),
    background: formState.background.trim(),
    motivation: formState.motivation.trim(),
    avatar: formState.avatar,
    luck: formState.luck,
    attributes: { ...formState.attributes },
    skills: { ...formState.skills },
    inventory: splitInventoryText(formState.inventory),
    buffs: [...formState.buffs],
    debuffs: [...formState.debuffs],
    note: formState.note.trim(),
    createdAt: currentCharacter?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export function buildFormStateFromCharacter(character: CharacterRecord): FormState {
  return {
    name: character.name,
    occupation: character.occupation,
    age: character.age,
    origin: character.origin,
    appearance: character.appearance,
    background: character.background,
    motivation: character.motivation,
    avatar: character.avatar,
    luck: character.luck,
    attributes: { ...character.attributes },
    skills: { ...character.skills },
    inventory: character.inventory.join('、'),
    buffs: [...character.buffs],
    debuffs: [...character.debuffs],
    note: character.note,
  };
}
