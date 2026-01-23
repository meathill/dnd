export type StepItem = {
	title: string;
	description: string;
};

export const steps: StepItem[] = [
	{ title: "身份信息", description: "角色姓名、职业与来源" },
	{ title: "基础属性", description: "八项主属性与派生" },
	{ title: "技能与装备", description: "擅长领域与随身物品" },
	{ title: "状态与背景", description: "Buff、Debuff 与设定" },
	{ title: "确认创建", description: "预览角色卡摘要" },
];

export const attributeOptions = [
	{ id: "strength", label: "力量", min: 20, max: 90, group: "身体" },
	{ id: "dexterity", label: "敏捷", min: 20, max: 90, group: "身体" },
	{ id: "constitution", label: "体质", min: 20, max: 90, group: "身体" },
	{ id: "size", label: "体型", min: 20, max: 90, group: "身体" },
	{ id: "intelligence", label: "智力", min: 40, max: 90, group: "心智" },
	{ id: "willpower", label: "意志", min: 30, max: 90, group: "心智" },
	{ id: "appearance", label: "外貌", min: 15, max: 90, group: "心智" },
	{ id: "education", label: "教育", min: 40, max: 90, group: "心智" },
] as const;

export type AttributeKey = (typeof attributeOptions)[number]["id"];
export type AttributeOption = (typeof attributeOptions)[number];

export const skillOptions = [
	{ id: "spotHidden", label: "侦查", group: "调查" },
	{ id: "libraryUse", label: "图书馆", group: "调查" },
	{ id: "listen", label: "聆听", group: "调查" },
	{ id: "psychology", label: "心理学", group: "调查" },
	{ id: "persuade", label: "说服", group: "社交" },
	{ id: "charm", label: "魅惑", group: "社交" },
	{ id: "stealth", label: "潜行", group: "行动" },
	{ id: "locksmith", label: "开锁", group: "行动" },
	{ id: "firearms", label: "枪械", group: "战斗" },
	{ id: "brawl", label: "格斗", group: "战斗" },
	{ id: "medicine", label: "医学", group: "学识" },
	{ id: "occult", label: "神秘学", group: "学识" },
] as const;

export type SkillId = (typeof skillOptions)[number]["id"];
export type SkillOption = (typeof skillOptions)[number];

export const buffOptions = ["灵感加持", "冷静分析", "行动迅捷", "夜视适应", "战斗节奏"] as const;
export const debuffOptions = ["轻微受伤", "噩梦缠身", "恐惧残留", "精神负荷", "疑虑加重"] as const;

export type BuffId = (typeof buffOptions)[number];
export type DebuffId = (typeof debuffOptions)[number];

export type FormState = {
	name: string;
	occupation: string;
	age: string;
	origin: string;
	appearance: string;
	background: string;
	motivation: string;
	attributes: Record<AttributeKey, number>;
	skills: Record<SkillId, boolean>;
	inventory: string;
	buffs: BuffId[];
	debuffs: DebuffId[];
	note: string;
};

export type UpdateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => void;

export type UpdateAttribute = (attributeKey: AttributeKey, value: number) => void;

export type ToggleSkill = (skillId: SkillId) => void;

export type ToggleBuff = (buff: BuffId) => void;

export type ToggleDebuff = (debuff: DebuffId) => void;

export const inputClassName =
	"w-full rounded-xl border border-[rgba(27,20,12,0.12)] bg-[rgba(255,255,255,0.8)] px-3 py-2 text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent-brass)] focus:outline-none";

export const fieldLabelClassName = "text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]";

export function buildDefaultAttributes(): Record<AttributeKey, number> {
	return {
		strength: 55,
		dexterity: 60,
		constitution: 50,
		size: 45,
		intelligence: 70,
		willpower: 65,
		appearance: 40,
		education: 75,
	};
}

export function buildDefaultSkills(): Record<SkillId, boolean> {
	return {
		spotHidden: true,
		libraryUse: true,
		listen: true,
		psychology: false,
		persuade: true,
		charm: false,
		stealth: false,
		locksmith: false,
		firearms: false,
		brawl: false,
		medicine: false,
		occult: false,
	};
}

export function buildDefaultFormState(): FormState {
	return {
		name: "沈砚",
		occupation: "调查记者",
		age: "31",
		origin: "静默港口",
		appearance: "瘦高、黑色风衣、常带速记本",
		background: "曾追踪港口失踪案，留下未解的档案。",
		motivation: "找出旅店里隐藏的真相，保护同伴。",
		attributes: buildDefaultAttributes(),
		skills: buildDefaultSkills(),
		inventory: "黑色风衣、左轮手枪、速记本、银质怀表",
		buffs: ["灵感加持"],
		debuffs: ["噩梦缠身"],
		note: "习惯在行动前整理线索，并标记可疑人物。",
	};
}
