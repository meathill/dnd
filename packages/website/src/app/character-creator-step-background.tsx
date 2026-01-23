import {
	buffOptions,
	debuffOptions,
	fieldLabelClassName,
	inputClassName,
	type FormState,
	type ToggleBuff,
	type ToggleDebuff,
	type UpdateField,
} from "./character-creator-data";

type CharacterCreatorStepBackgroundProps = {
	formState: FormState;
	onFieldChange: UpdateField;
	onToggleBuff: ToggleBuff;
	onToggleDebuff: ToggleDebuff;
};

export default function CharacterCreatorStepBackground({
	formState,
	onFieldChange,
	onToggleBuff,
	onToggleDebuff,
}: CharacterCreatorStepBackgroundProps) {
	return (
		<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-5">
				<div>
					<p className={fieldLabelClassName}>增益状态</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{buffOptions.map((buff) => (
							<button
								className={`rounded-lg px-3 py-1 text-xs transition ${
									formState.buffs.includes(buff)
										? "bg-[rgba(61,82,56,0.16)] text-[var(--accent-moss)]"
										: "bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]"
								}`}
								onClick={() => onToggleBuff(buff)}
								type="button"
								key={buff}
							>
								{buff}
							</button>
						))}
					</div>
				</div>

				<div>
					<p className={fieldLabelClassName}>减益状态</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{debuffOptions.map((debuff) => (
							<button
								className={`rounded-lg px-3 py-1 text-xs transition ${
									formState.debuffs.includes(debuff)
										? "bg-[rgba(176,74,53,0.16)] text-[var(--accent-ember)]"
										: "bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]"
								}`}
								onClick={() => onToggleDebuff(debuff)}
								type="button"
								key={debuff}
							>
								{debuff}
							</button>
						))}
					</div>
				</div>

				<div>
					<p className={fieldLabelClassName}>行为习惯</p>
					<textarea
						className={`${inputClassName} mt-3 min-h-[120px]`}
						placeholder="角色的口头禅、习惯动作、禁忌"
						rows={4}
						value={formState.note}
						onChange={(event) => onFieldChange("note", event.target.value)}
					></textarea>
				</div>
			</div>

			<div className="space-y-4">
				<p className={fieldLabelClassName}>背景设定</p>
				<textarea
					className={`${inputClassName} min-h-[140px]`}
					placeholder="经历、线索、与模组相关的过去"
					rows={5}
					value={formState.background}
					onChange={(event) => onFieldChange("background", event.target.value)}
				></textarea>
				<textarea
					className={`${inputClassName} min-h-[120px]`}
					placeholder="角色动机、近期目标"
					rows={4}
					value={formState.motivation}
					onChange={(event) => onFieldChange("motivation", event.target.value)}
				></textarea>
			</div>
		</div>
	);
}
