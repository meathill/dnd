import {
	fieldLabelClassName,
	inputClassName,
	skillOptions,
	type FormState,
	type SkillOption,
	type ToggleSkill,
	type UpdateField,
} from "./character-creator-data";

type CharacterCreatorStepSkillsProps = {
	formState: FormState;
	selectedSkills: SkillOption[];
	onToggleSkill: ToggleSkill;
	onFieldChange: UpdateField;
};

export default function CharacterCreatorStepSkills({
	formState,
	selectedSkills,
	onToggleSkill,
	onFieldChange,
}: CharacterCreatorStepSkillsProps) {
	return (
		<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-4">
				<p className={fieldLabelClassName}>技能选择</p>
				<div className="grid gap-2 sm:grid-cols-2">
					{skillOptions.map((skill) => (
						<button
							className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
								formState.skills[skill.id]
									? "border-[rgba(61,82,56,0.4)] bg-[rgba(61,82,56,0.12)] text-[var(--accent-moss)]"
									: "border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]"
							}`}
							onClick={() => onToggleSkill(skill.id)}
							type="button"
							key={skill.id}
						>
							<span>{skill.label}</span>
							<span className="text-xs text-[var(--ink-soft)]">{skill.group}</span>
						</button>
					))}
				</div>
			</div>

			<div className="space-y-4">
				<p className={fieldLabelClassName}>装备与道具</p>
				<textarea
					className={`${inputClassName} min-h-[160px]`}
					placeholder="用逗号分隔物品，例如：速记本、左轮手枪"
					rows={6}
					value={formState.inventory}
					onChange={(event) => onFieldChange("inventory", event.target.value)}
				></textarea>
				<div className="panel-muted rounded-xl p-4">
					<p className="text-sm font-semibold text-[var(--ink-strong)]">已选技能</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{selectedSkills.length === 0 ? (
							<span className="text-xs text-[var(--ink-soft)]">暂无选择</span>
						) : (
							selectedSkills.map((skill) => (
								<span
									className="rounded-lg bg-[rgba(61,82,56,0.12)] px-3 py-1 text-xs text-[var(--accent-moss)]"
									key={skill.id}
								>
									{skill.label}
								</span>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
