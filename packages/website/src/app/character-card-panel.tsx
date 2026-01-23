import CharacterCreator from "./character-creator";
import {
	attributes,
	buffs,
	debuffs,
	inventory,
	skills,
	stats,
	type StatTone,
} from "./home-data";

const statToneStyles = {
	moss: {
		bar: "bg-[var(--accent-moss)]",
		text: "text-[var(--accent-moss)]",
		track: "bg-[rgba(61,82,56,0.18)]",
	},
	brass: {
		bar: "bg-[var(--accent-brass)]",
		text: "text-[var(--accent-brass)]",
		track: "bg-[rgba(182,121,46,0.18)]",
	},
	ember: {
		bar: "bg-[var(--accent-ember)]",
		text: "text-[var(--accent-ember)]",
		track: "bg-[rgba(176,74,53,0.18)]",
	},
	river: {
		bar: "bg-[var(--accent-river)]",
		text: "text-[var(--accent-river)]",
		track: "bg-[rgba(46,108,106,0.18)]",
	},
} satisfies Record<StatTone, { bar: string; text: string; track: string }>;

function getPercent(value: number, max: number): string {
	if (max <= 0) {
		return "0%";
	}

	const percent = Math.round((value / max) * 100);
	const clamped = Math.min(100, Math.max(0, percent));
	return `${clamped}%`;
}

export default function CharacterCardPanel() {
	return (
		<div
			className="panel-card animate-[fade-up_0.9s_ease-out_both] flex flex-col gap-4 rounded-xl p-4"
			style={{ animationDelay: "0.12s" }}
		>
			<div className="flex flex-wrap items-center gap-4">
				<div className="h-16 w-16 rounded-xl bg-[linear-gradient(135deg,rgba(61,82,56,0.2),rgba(182,121,46,0.2))] p-1">
					<div className="flex h-full w-full items-center justify-center rounded-xl bg-[rgba(255,255,255,0.7)] text-sm text-[var(--ink-soft)]">
						肖像
					</div>
				</div>
				<div className="flex-1">
					<p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">人物卡</p>
					<h2 className="font-[var(--font-display)] text-2xl text-[var(--ink-strong)]">沈砚</h2>
					<p className="text-sm text-[var(--ink-muted)]">调查记者 · 31 岁 · 静默港口</p>
				</div>
			</div>

			<div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
				<p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">角色操作</p>
				<div className="mt-3">
					<CharacterCreator />
				</div>
			</div>

			<div className="space-y-4">
				{stats.map((stat) => {
					const tone = statToneStyles[stat.tone];
					return (
						<div className="space-y-2" key={stat.label}>
							<div className="flex items-center justify-between text-sm">
								<span className="text-[var(--ink-muted)]">{stat.label}</span>
								<span className={`font-mono text-sm ${tone.text}`}>
									{stat.value} / {stat.max}
								</span>
							</div>
							<div className={`h-2 w-full rounded-lg ${tone.track}`}>
								<div
									className={`h-2 rounded-lg ${tone.bar}`}
									style={{ width: getPercent(stat.value, stat.max) }}
								></div>
							</div>
						</div>
					);
				})}
			</div>

			<div>
				<h3 className="text-sm font-semibold text-[var(--ink-strong)]">属性</h3>
				<div className="mt-3 grid grid-cols-2 gap-2">
					{attributes.map((attr) => (
						<div className="panel-muted rounded-xl px-3 py-2" key={attr.label}>
							<p className="text-xs text-[var(--ink-soft)]">{attr.label}</p>
							<p className="font-mono text-sm text-[var(--ink-strong)]">{attr.value}</p>
						</div>
					))}
				</div>
			</div>

			<div>
				<h3 className="text-sm font-semibold text-[var(--ink-strong)]">核心技能</h3>
				<div className="mt-3 space-y-2">
					{skills.map((skill) => (
						<div
							className="flex items-center justify-between rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] px-3 py-2 text-sm"
							key={skill.label}
						>
							<span className="text-[var(--ink-muted)]">{skill.label}</span>
							<span className="font-mono text-[var(--ink-strong)]">{skill.value}</span>
						</div>
					))}
				</div>
			</div>

			<div>
				<h3 className="text-sm font-semibold text-[var(--ink-strong)]">随身物品</h3>
				<ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
					{inventory.map((item) => (
						<li className="rounded-lg bg-[rgba(255,255,255,0.6)] px-3 py-2" key={item}>
							{item}
						</li>
					))}
				</ul>
			</div>

			<div>
				<h3 className="text-sm font-semibold text-[var(--ink-strong)]">状态</h3>
				<div className="mt-3 space-y-4">
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">增益</p>
						<div className="mt-2 flex flex-wrap gap-2">
							{buffs.map((buff) => (
								<span
									className="rounded-lg bg-[rgba(61,82,56,0.16)] px-3 py-1 text-xs text-[var(--accent-moss)]"
									key={buff}
								>
									{buff}
								</span>
							))}
						</div>
					</div>
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">减益</p>
						<div className="mt-2 flex flex-wrap gap-2">
							{debuffs.map((debuff) => (
								<span
									className="rounded-lg bg-[rgba(176,74,53,0.16)] px-3 py-1 text-xs text-[var(--accent-ember)]"
									key={debuff}
								>
									{debuff}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
