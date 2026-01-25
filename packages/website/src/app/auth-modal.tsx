'use client';

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
  if (!isOpen) {
    return null;
  }

  const isSignUp = mode === 'signUp';
  const title = isSignUp ? '创建账号' : '账号登录';
  const hint = isSignUp ? '填写邮箱与密码即可完成注册。' : '使用邮箱与密码登录游戏。';
  const submitLabel = isSignUp ? '注册' : '登录';
  const toggleLabel = isSignUp ? '已有账号？去登录' : '没有账号？去注册';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,10,8,0.45)] p-4">
      <div className="panel-card w-full max-w-md rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">账号</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{title}</h2>
            <p className="text-sm text-[var(--ink-muted)]">{hint}</p>
          </div>
          <button
            className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {isSignUp ? (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]" htmlFor="auth-name">
                昵称
              </label>
              <input
                className="w-full rounded-lg border border-[rgba(27,20,12,0.12)] bg-[rgba(255,255,255,0.8)] px-3 py-2 text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent-brass)] focus:outline-none"
                id="auth-name"
                onChange={(event) => onDisplayNameChange(event.target.value)}
                placeholder="你的称呼"
                type="text"
                value={displayName}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]" htmlFor="auth-email">
              邮箱
            </label>
            <input
              className="w-full rounded-lg border border-[rgba(27,20,12,0.12)] bg-[rgba(255,255,255,0.8)] px-3 py-2 text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent-brass)] focus:outline-none"
              id="auth-email"
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              type="email"
              value={email}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]" htmlFor="auth-password">
              密码
            </label>
            <input
              className="w-full rounded-lg border border-[rgba(27,20,12,0.12)] bg-[rgba(255,255,255,0.8)] px-3 py-2 text-sm text-[var(--ink-strong)] placeholder:text-[var(--ink-soft)] focus:border-[var(--accent-brass)] focus:outline-none"
              id="auth-password"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="至少 8 位"
              type="password"
              value={password}
            />
          </div>
        </div>

        {message ? <p className="mt-3 text-xs text-[var(--accent-ember)]">{message}</p> : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-lg border border-[rgba(27,20,12,0.12)] px-4 py-2 text-xs text-[var(--ink-muted)]"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="rounded-lg bg-[var(--accent-brass)] px-4 py-2 text-xs text-white"
            disabled={isSubmitting}
            onClick={onSubmit}
            type="button"
          >
            {isSubmitting ? '处理中...' : submitLabel}
          </button>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="text-xs text-[var(--ink-soft)]"
            onClick={() => onModeChange(isSignUp ? 'signIn' : 'signUp')}
            type="button"
          >
            {toggleLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
