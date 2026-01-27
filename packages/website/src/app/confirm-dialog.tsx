'use client';

import { Button } from '../components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../components/ui/dialog';

export type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = '确认删除',
  cancelLabel = '取消',
  isProcessing = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogPopup className="max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">确认</p>
            <DialogTitle className="text-xl font-semibold text-[var(--ink-strong)]">{title}</DialogTitle>
            {description ? <p className="text-sm text-[var(--ink-muted)]">{description}</p> : null}
          </div>
          <Button onClick={onCancel} size="sm" variant="outline">
            关闭
          </Button>
        </DialogHeader>

        <DialogPanel className="space-y-3">
          <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4 text-sm text-[var(--ink-muted)]">
            删除后将无法恢复，请确认是否继续。
          </div>
        </DialogPanel>

        <DialogFooter className="justify-end" variant="bare">
          <Button onClick={onCancel} size="sm" variant="outline">
            {cancelLabel}
          </Button>
          <Button disabled={isProcessing} onClick={onConfirm} size="sm" variant="destructive">
            {isProcessing ? '处理中...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
