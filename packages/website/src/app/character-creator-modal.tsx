import type { ReactNode } from 'react';
import type { StepItem } from './character-creator-data';
import { Button } from '../components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../components/ui/dialog';

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
  const progressWidth = `${Math.round(((currentStep + 1) / steps.length) * 100)}%`;
  const isLastStep = currentStep >= steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogPopup className="h-[min(88vh,820px)] max-w-5xl" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-start justify-between gap-3 border-b border-[rgba(27,20,12,0.08)]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">创建人物卡</p>
            <DialogTitle className="font-[var(--font-display)] text-2xl text-[var(--ink-strong)]">
              {steps[currentStep].title}
            </DialogTitle>
            <p className="text-sm text-[var(--ink-muted)]">{steps[currentStep].description}</p>
          </div>
          <Button className="text-xs text-[var(--ink-muted)]" onClick={onClose} size="sm" variant="outline">
            关闭
          </Button>
        </DialogHeader>

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

        <DialogPanel className="flex-1 overflow-y-auto px-4 py-4">{children}</DialogPanel>

        <DialogFooter
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(27,20,12,0.08)]"
          variant="bare"
        >
          <div className="flex items-center gap-2">
            <Button onClick={onReset} size="sm" variant="outline">
              重置
            </Button>
            <span className="text-xs text-[var(--ink-soft)]">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          {submitError ? <p className="text-xs text-[var(--accent-ember)]">{submitError}</p> : null}
          <div className="flex gap-2">
            <Button onClick={onPrevious} size="sm" variant="outline">
              上一步
            </Button>
            {isLastStep ? (
              <Button
                className="bg-[var(--accent-brass)] text-white hover:bg-[var(--accent-brass)]/90"
                onClick={onComplete}
                size="sm"
              >
                创建角色
              </Button>
            ) : (
              <Button
                className="bg-[var(--accent-brass)] text-white hover:bg-[var(--accent-brass)]/90"
                disabled={isNextDisabled}
                onClick={onNext}
                size="sm"
              >
                下一步
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
