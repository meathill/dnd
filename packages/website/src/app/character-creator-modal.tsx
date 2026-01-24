import type { ReactNode } from 'react';
import type { StepItem } from './character-creator-data';

export type CharacterCreatorModalProps = {
  isOpen: boolean;
  currentStep: number;
  steps: StepItem[];
  submitError: string;
  onClose: () => void;
  onReset: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  isNextDisabled?: boolean;
  children: ReactNode;
};

export default function CharacterCreatorModal({
  isOpen,
  currentStep,
  steps,
  submitError,
  onClose,
  onReset,
  onPrevious,
  onNext,
  onComplete,
  isNextDisabled = false,
  children,
}: CharacterCreatorModalProps) {
  if (!isOpen) {
    return null;
  }

  const progressWidth = `${Math.round(((currentStep + 1) / steps.length) * 100)}%`;
  const isLastStep = currentStep >= steps.length - 1;
  const nextButtonClassName = `rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white ${
    isNextDisabled ? 'cursor-not-allowed opacity-60' : ''
  }`;

  return (
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
            onClick={onClose}
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
                  <span className={`text-xs ${isActive ? 'text-[var(--accent-brass)]' : 'text-[var(--ink-soft)]'}`}>
                    0{index + 1}
                  </span>
                  <p className={`text-xs ${isActive ? 'text-[var(--ink-strong)]' : 'text-[var(--ink-soft)]'}`}>
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(27,20,12,0.08)] px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-1.5 text-xs text-[var(--ink-muted)]"
              onClick={onReset}
              type="button"
            >
              重置
            </button>
            <span className="text-xs text-[var(--ink-soft)]">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          {submitError ? <p className="text-xs text-[var(--accent-ember)]">{submitError}</p> : null}
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-1.5 text-xs text-[var(--ink-muted)]"
              onClick={onPrevious}
              type="button"
            >
              上一步
            </button>
            {isLastStep ? (
              <button
                className="rounded-lg bg-[var(--accent-brass)] px-4 py-1.5 text-xs text-white"
                onClick={onComplete}
                type="button"
              >
                创建角色
              </button>
            ) : (
              <button className={nextButtonClassName} onClick={onNext} disabled={isNextDisabled} type="button">
                下一步
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
