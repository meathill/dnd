import type { CharacterRecord } from '../game/types.ts';
import { SAMPLE_SCRIPT } from '../game/sample-script.ts';

export function buildSampleCharacter(): CharacterRecord {
  const timestamp = new Date().toISOString();
  return {
    id: 'character-lin-wu',
    scriptId: SAMPLE_SCRIPT.id,
    name: '林雾',
    occupation: '记者',
    age: '29',
    origin: '松柏镇',
    appearance: '黑色风衣，手里总夹着速记本。',
    background: '长期追踪本地怪谈与失踪案。',
    motivation: '弄清老宅事件背后的真相。',
    avatar: '',
    luck: 60,
    attributes: {
      strength: 45,
      dexterity: 60,
      constitution: 50,
      size: 55,
      intelligence: 75,
      willpower: 65,
      appearance: 50,
      education: 70,
    },
    skills: {
      spotHidden: 65,
      listen: 55,
      occult: 35,
      psychology: 45,
      persuade: 50,
    },
    inventory: ['手电筒', '录音机', '盐'],
    buffs: ['直觉敏锐'],
    debuffs: [],
    note: '习惯先记录痕迹，再与目击者交谈。',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
