import {
	attributeOptions,
	fieldLabelClassName,
	inputClassName,
	type FormState,
	type UpdateAttribute,
} from "./character-creator-data";

type CharacterCreatorStepAttributesProps = {
	formState: FormState;
	onAttributeChange: UpdateAttribute;
	onApplyAverage: () => void;
	onApplyRandom: () => void;
};

export default function CharacterCreatorStepAttributes({
	formState,
	onAttributeChange,
	onApplyAverage,
	onApplyRandom,
}: CharacterCreatorStepAttributesProps) {
	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className={fieldLabelClassName}>基础属性</p>
					<p className="text-sm text-[var(--ink-muted)]">建议保持在 20 - 90 之间。</p>
				</div>
				<div className="flex gap-2">
					<button
						className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
						onClick={onApplyAverage}
						type="button"
					>
						平均值
					</button>
					<button
						className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
						onClick={onApplyRandom}
						type="button"
					>
						随机生成
					</button>
				</div>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{attributeOptions.map((attribute) => (
					<div className="panel-muted flex flex-col gap-2 rounded-xl px-4 py-3" key={attribute.id}>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold text-[var(--ink-strong)]">{attribute.label}</p>
								<p className="text-xs text-[var(--ink-soft)]">{attribute.group}</p>
							</div>
							<span className="text-xs text-[var(--ink-soft)]">
								{attribute.min}-{attribute.max}
							</span>
						</div>
						<input
							className={inputClassName}
							max={attribute.max}
							min={attribute.min}
							type="number"
							value={formState.attributes[attribute.id]}
							onChange={(event) => onAttributeChange(attribute.id, Number(event.target.value) || attribute.min)}
						/>
					</div>
				))}
			</div>
		</div>
	);
}
