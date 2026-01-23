import { fieldLabelClassName, inputClassName, type FormState, type UpdateField } from "./character-creator-data";

type CharacterCreatorStepBasicProps = {
	formState: FormState;
	onFieldChange: UpdateField;
};

export default function CharacterCreatorStepBasic({ formState, onFieldChange }: CharacterCreatorStepBasicProps) {
	return (
		<div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
			<div className="space-y-4">
				<div>
					<p className={fieldLabelClassName}>基本信息</p>
					<div className="mt-3 grid gap-3 sm:grid-cols-2">
						<input
							className={inputClassName}
							placeholder="角色姓名"
							value={formState.name}
							onChange={(event) => onFieldChange("name", event.target.value)}
						/>
						<input
							className={inputClassName}
							placeholder="职业"
							value={formState.occupation}
							onChange={(event) => onFieldChange("occupation", event.target.value)}
						/>
						<input
							className={inputClassName}
							placeholder="年龄"
							value={formState.age}
							onChange={(event) => onFieldChange("age", event.target.value)}
						/>
						<input
							className={inputClassName}
							placeholder="出身/城市"
							value={formState.origin}
							onChange={(event) => onFieldChange("origin", event.target.value)}
						/>
					</div>
				</div>

				<div>
					<p className={fieldLabelClassName}>外观与标签</p>
					<textarea
						className={`${inputClassName} mt-3 min-h-[120px]`}
						placeholder="外观、习惯或明显特征"
						rows={4}
						value={formState.appearance}
						onChange={(event) => onFieldChange("appearance", event.target.value)}
					></textarea>
				</div>
			</div>

			<div className="panel-muted rounded-xl p-4">
				<p className="text-sm font-semibold text-[var(--ink-strong)]">创角提示</p>
				<ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
					<li>职业决定了可学习技能与社交资源。</li>
					<li>年龄影响体力与经验，建议与模组时代匹配。</li>
					<li>写下明显特征，方便 DM 在叙事中抓取。</li>
				</ul>
			</div>
		</div>
	);
}
