'use client';

import { Button } from '../components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

export type AuthModalProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  mode: 'signIn' | 'signUp';
  email: string;
  password: string;
  displayName: string;
  message: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onDisplayNameChange: (displayName: string) => void;
  onModeChange: (mode: 'signIn' | 'signUp') => void;
  onClose: () => void;
  onSubmit: () => void;
};

export default function AuthModal({
  isOpen,
  isSubmitting,
  mode,
  email,
  password,
  displayName,
  message,
  onEmailChange,
  onPasswordChange,
  onDisplayNameChange,
  onModeChange,
  onClose,
  onSubmit,
}: AuthModalProps) {
  const isSignUp = mode === 'signUp';
  const title = isSignUp ? '创建账号' : '账号登录';
  const hint = isSignUp ? '填写邮箱与密码即可完成注册。' : '使用邮箱与密码登录游戏。';
  const submitLabel = isSignUp ? '注册' : '登录';
  const toggleLabel = isSignUp ? '已有账号？去登录' : '没有账号？去注册';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogPopup className="max-w-md" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">账号</p>
            <DialogTitle className="text-xl font-semibold text-[var(--ink-strong)]">{title}</DialogTitle>
            <p className="text-sm text-[var(--ink-muted)]">{hint}</p>
          </div>
          <Button onClick={onClose} size="sm" variant="outline">
            关闭
          </Button>
        </DialogHeader>

        <DialogPanel className="space-y-3">
          {isSignUp ? (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]" htmlFor="auth-name">
                昵称
              </Label>
              <Input
                className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                id="auth-name"
                onChange={(event) => onDisplayNameChange(event.target.value)}
                placeholder="你的称呼"
                type="text"
                value={displayName}
                size="sm"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]" htmlFor="auth-email">
              邮箱
            </Label>
            <Input
              className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
              id="auth-email"
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
              size="sm"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]" htmlFor="auth-password">
              密码
            </Label>
            <Input
              className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
              id="auth-password"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="至少 8 位"
              type="password"
              value={password}
              size="sm"
            />
          </div>
          {message ? <p className="text-xs text-[var(--accent-ember)]">{message}</p> : null}
        </DialogPanel>

        <DialogFooter className="items-center justify-between" variant="bare">
          <Button onClick={() => onModeChange(isSignUp ? 'signIn' : 'signUp')} size="sm" variant="ghost">
            {toggleLabel}
          </Button>
          <div className="flex gap-2">
            <Button onClick={onClose} size="sm" variant="outline">
              取消
            </Button>
            <Button disabled={isSubmitting} onClick={onSubmit} size="sm">
              {isSubmitting ? '处理中...' : submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
