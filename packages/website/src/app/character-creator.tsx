"use client";

import { useMemo, useState } from "react";
import CharacterCreatorStepAttributes from "./character-creator-step-attributes";
import CharacterCreatorStepBackground from "./character-creator-step-background";
import CharacterCreatorStepBasic from "./character-creator-step-basic";
import CharacterCreatorStepSkills from "./character-creator-step-skills";
import CharacterCreatorStepSummary from "./character-creator-step-summary";
import {
	attributeOptions,
	buildDefaultFormState,
	skillOptions,
	steps,
	type AttributeKey,
	type BuffId,
	type DebuffId,
	type FormState,
	type SkillId,
	type SkillOption,
} from "./character-creator-data";

function getRandomInRange(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function CharacterCreator() {
	const [isOpen, setIsOpen] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);
	const [formState, setFormState] = useState<FormState>(buildDefaultFormState());

	const progressWidth = `${Math.round(((currentStep + 1) / steps.length) * 100)}%`;
	const selectedSkills = useMemo<SkillOption[]>(
		() => skillOptions.filter((skill) => formState.skills[skill.id]),
		[formState.skills],
	);
	const inventoryList = useMemo(
		() =>
			formState.inventory
				.split(/[，,]/)
				.map((item) => item.trim())
				.filter(Boolean),
		[formState.inventory],
	);

	function openCreator() {
		setIsOpen(true);
	}

	function closeCreator() {
		setIsOpen(false);
	}

	function resetCreator() {
		setFormState(buildDefaultFormState());
		setCurrentStep(0);
	}

	function goNextStep() {
		setCurrentStep((value) => Math.min(value + 1, steps.length - 1));
	}

	function goPreviousStep() {
		setCurrentStep((value) => Math.max(value - 1, 0));
	}

	function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
		setFormState((current) => ({
			...current,
			[key]: value,
		}));
	}

	function updateAttribute(attributeKey: AttributeKey, value: number) {
		setFormState((current) => ({
			...current,
			attributes: {
				...current.attributes,
				[attributeKey]: value,
			},
		}));
	}

	function toggleSkill(skillId: SkillId) {
		setFormState((current) => ({
			...current,
			skills: {
				...current.skills,
				[skillId]: !current.skills[skillId],
			},
		}));
	}

	function toggleBuff(buff: BuffId) {
		setFormState((current) => {
			const exists = current.buffs.includes(buff);
			const nextList = exists ? current.buffs.filter((item) => item !== buff) : [...current.buffs, buff];
			return {
				...current,
				buffs: nextList,
			};
		});
	}

	function toggleDebuff(debuff: DebuffId) {
		setFormState((current) => {
			const exists = current.debuffs.includes(debuff);
			const nextList = exists ? current.debuffs.filter((item) => item !== debuff) : [...current.debuffs, debuff];
			return {
				...current,
				debuffs: nextList,
			};
		});
	}

	function applyAverageAttributes() {
		setFormState((current) => {
			const nextAttributes = { ...current.attributes };
			attributeOptions.forEach((attribute) => {
				nextAttributes[attribute.id] = Math.round((attribute.min + attribute.max) / 2);
			});
			return {
				...current,
				attributes: nextAttributes,
			};
		});
	}

	function applyRandomAttributes() {
		setFormState((current) => {
			const nextAttributes = { ...current.attributes };
			attributeOptions.forEach((attribute) => {
				nextAttributes[attribute.id] = getRandomInRange(attribute.min, attribute.max);
			});
			return {
				...current,
				attributes: nextAttributes,
			};
		});
	}

	return (
		<div className="flex flex-wrap gap-3">
			<button
				className="rounded-lg bg-[var(--accent-brass)] px-4 py-2 text-sm text-white shadow-[0_12px_30px_-18px_var(--accent-brass)] transition hover:-translate-y-0.5"
				onClick={openCreator}
				type="button"
			>
				创建角色
			</button>
			<button
				className="rounded-lg border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-4 py-2 text-sm text-[var(--ink-strong)] transition hover:-translate-y-0.5 hover:border-[var(--accent-brass)]"
				type="button"
			>
				载入模组
			</button>
			<button
				className="rounded-lg border border-[var(--ring-soft)] bg-[rgba(255,255,255,0.7)] px-4 py-2 text-sm text-[var(--ink-strong)] transition hover:-translate-y-0.5 hover:border-[var(--accent-brass)]"
				type="button"
			>
				开始冒险
			</button>

			{isOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
					<div className="absolute inset-0 bg-[rgba(15,10,6,0.45)] backdrop-blur"></div>
					<div className="panel-card relative flex h-[min(88vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl">
						<div className="flex items-center justify-between border-b border-[rgba(27,20,12,0.08)] px-4 py-4">
							<div>
								<p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">创建人物卡</p>
								<h2 className="font-[var(--font-display)] text-2xl text-[var(--ink-strong)]">{steps[currentStep].title}</h2>
								<p className="text-sm text-[var(--ink-muted)]">{steps[currentStep].description}</p>
							</div>
							<button
								className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
								onClick={closeCreator}
								type="button"
							>
								关闭
							</button>
						</div>

						<div className="relative">
							<div className="h-1 w-full bg-[rgba(27,20,12,0.08)]">
								<div className="h-1 bg-[var(--accent-brass)] transition-all" style={{ width: progressWidth }}></div>
							</div>
							<div className="grid gap-3 px-4 py-4 sm:grid-cols-5">
								{steps.map((step, index) => {
									const isActive = index === currentStep;
									return (
										<div className="flex flex-col gap-2" key={step.title}>
											<span
												className={`text-xs ${
													isActive ? "text-[var(--accent-brass)]" : "text-[var(--ink-soft)]"
												}`}
											>
												0{index + 1}
											</span>
											<p className={`text-xs ${isActive ? "text-[var(--ink-strong)]" : "text-[var(--ink-soft)]"}`}>
												{step.title}
											</p>
										</div>
									);
								})}
							</div>
						</div>

						<div className="flex-1 overflow-y-auto px-4 py-4">
							{currentStep === 0 ? (
								<CharacterCreatorStepBasic formState={formState} onFieldChange={updateField} />
							) : null}
							{currentStep === 1 ? (
								<CharacterCreatorStepAttributes
									formState={formState}
									onAttributeChange={updateAttribute}
									onApplyAverage={applyAverageAttributes}
									onApplyRandom={applyRandomAttributes}
								/>
							) : null}
							{currentStep === 2 ? (
								<CharacterCreatorStepSkills
									formState={formState}
									selectedSkills={selectedSkills}
									onToggleSkill={toggleSkill}
									onFieldChange={updateField}
								/>
							) : null}
							{currentStep === 3 ? (
								<CharacterCreatorStepBackground
									formState={formState}
									onFieldChange={updateField}
									onToggleBuff={toggleBuff}
									onToggleDebuff={toggleDebuff}
								/>
							) : null}
							{currentStep === 4 ? (
								<CharacterCreatorStepSummary
									formState={formState}
									selectedSkills={selectedSkills}
									inventoryList={inventoryList}
								/>
							) : null}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(27,20,12,0.08)] px-4 py-4">
							<div className="flex items-center gap-2">
								<button
									className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-1.5 text-xs text-[var(--ink-muted)]"
									onClick={resetCreator}
									type="button"
								>
									重置
								</button>
								<span className="text-xs text-[var(--ink-soft)]">
									{currentStep + 1} / {steps.length}
								</span>
							</div>
							<div className="flex gap-2">
								<button
									className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-1.5 text-xs text-[var(--ink-muted)]"
									onClick={goPreviousStep}
									type="button"
								>
									上一步
								</button>
								{currentStep < steps.length - 1 ? (
									<button
										className="rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white"
										onClick={goNextStep}
										type="button"
									>
										下一步
									</button>
								) : (
									<button
										className="rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white"
										type="button"
									>
										创建角色
									</button>
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
