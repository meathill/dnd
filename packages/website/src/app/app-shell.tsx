'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from './auth-modal';
import SettingsModal from './settings-modal';
import { authClient } from '../lib/auth/auth-client';
import type { SessionInfo, UserSettings } from '../lib/session/session-types';
import { SessionProvider } from '../lib/session/session-context';

const sidebarTitleClassName = 'text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]';

const defaultSettings: UserSettings = {
  provider: 'openai',
  model: '',
};

type AppShellProps = {
  activeNav: 'home' | 'script' | 'game';
  scriptId?: string | null;
  gameId?: string | null;
  children: ReactNode;
};

function buildNavItemClass(isActive: boolean, isDisabled: boolean): string {
  if (isDisabled) {
    return 'w-full rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.5)] px-3 py-2 text-left text-xs text-[var(--ink-soft)]';
  }
  return `w-full rounded-lg px-3 py-2 text-left text-sm transition ${
    isActive
      ? 'bg-[var(--accent-brass)] text-white'
      : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-muted)] hover:border-[var(--accent-brass)]'
  }`;
}

export default function AppShell({ activeNav, scriptId, gameId, children }: AppShellProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<UserSettings>(defaultSettings);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const isLoggedIn = Boolean(session);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) {
        setSession(null);
        return;
      }
      const data = (await response.json()) as { session?: SessionInfo | null };
      setSession(data.session ?? null);
    } catch {
      setSession(null);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  function handleBackToHome() {
    router.push('/');
  }

  function handleOpenScriptDetail() {
    if (!scriptId) {
      return;
    }
    router.push(`/scripts/${scriptId}`);
  }

  function handleOpenGameStage() {
    if (!gameId) {
      return;
    }
    router.push(`/games/${gameId}`);
  }

  function handleOpenSettings() {
    if (!session) {
      return;
    }
    setSettingsDraft(session.settings ?? defaultSettings);
    setSettingsMessage('');
    setIsSettingsOpen(true);
  }

  function handleCloseSettings() {
    setIsSettingsOpen(false);
  }

  function handleOpenAuth() {
    setAuthMessage('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthDisplayName('');
    setAuthMode('signIn');
    setIsAuthOpen(true);
  }

  function handleCloseAuth() {
    setIsAuthOpen(false);
  }

  async function handleSubmitAuth() {
    const email = authEmail.trim();
    const password = authPassword.trim();
    const displayName = authDisplayName.trim();
    if (!email) {
      setAuthMessage('请输入有效的邮箱地址。');
      return;
    }
    if (!password) {
      setAuthMessage('请输入密码。');
      return;
    }
    if (authMode === 'signUp' && !displayName) {
      setAuthMessage('请输入昵称。');
      return;
    }
    setIsAuthSubmitting(true);
    setAuthMessage('');
    try {
      const result =
        authMode === 'signUp'
          ? await authClient.signUp.email({ email, password, name: displayName })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        const message = result.error.message ?? (authMode === 'signUp' ? '注册失败。' : '登录失败。');
        setAuthMessage(message);
        return;
      }
      await loadSession();
      setIsAuthOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : authMode === 'signUp' ? '注册失败。' : '登录失败。';
      setAuthMessage(message);
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    try {
      await authClient.signOut();
    } finally {
      await loadSession();
    }
  }

  async function handleSaveSettings() {
    if (!session) {
      setSettingsMessage('未登录无法保存设置。');
      return;
    }
    setIsSavingSettings(true);
    setSettingsMessage('');
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsDraft),
      });
      const data = (await response.json()) as { settings?: UserSettings; error?: string };
      if (!response.ok || !data.settings) {
        throw new Error(data.error ?? '保存设置失败');
      }
      setSession((current) => (current ? { ...current, settings: data.settings ?? null } : current));
      setIsSettingsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存设置失败';
      setSettingsMessage(message);
    } finally {
      setIsSavingSettings(false);
    }
  }

  return (
    <SessionProvider value={{ session, reloadSession: loadSession }}>
      <div className="min-h-screen lg:h-screen lg:overflow-hidden grid grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          className="panel-card animate-[fade-up_0.7s_ease-out_both] flex w-full flex-col gap-4 p-4 lg:h-full lg:overflow-hidden"
          style={{ animationDelay: '0.05s' }}
        >
          <div className="space-y-3">
            <p className={sidebarTitleClassName}>AI 跑团体验 · COC 模式</p>
            <h1 className="text-3xl text-[var(--ink-strong)] sm:text-4xl font-[var(--font-accent)]">肉团长</h1>
            <p className="text-sm text-[var(--ink-muted)]">导航与账号入口，随时切换不同阶段。</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">导航</p>
            <button className={buildNavItemClass(activeNav === 'home', false)} onClick={handleBackToHome} type="button">
              首页
            </button>
            <button
              className={buildNavItemClass(activeNav === 'script', !scriptId)}
              disabled={!scriptId}
              onClick={handleOpenScriptDetail}
              type="button"
            >
              剧本详情
            </button>
            <button
              className={buildNavItemClass(activeNav === 'game', !gameId)}
              disabled={!gameId}
              onClick={handleOpenGameStage}
              type="button"
            >
              游戏现场
            </button>
            <button
              className={buildNavItemClass(false, !isLoggedIn)}
              disabled={!isLoggedIn}
              onClick={handleOpenSettings}
              type="button"
            >
              设置
            </button>
          </div>

          <div className="mt-auto space-y-2 text-xs text-[var(--ink-soft)]">
            <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3">
              <p className="font-semibold text-[var(--ink-strong)]">账号状态</p>
              <p className="mt-2">{isLoggedIn ? `已登录：${session?.displayName}` : '未登录'}</p>
              <p className="mt-1">登录后可使用设置与保存记录。</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {isLoggedIn ? (
                  <button
                    className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
                    onClick={handleSignOut}
                    type="button"
                  >
                    退出登录
                  </button>
                ) : (
                  <button
                    className="rounded-lg bg-[var(--accent-brass)] px-3 py-1 text-xs text-white"
                    onClick={handleOpenAuth}
                    type="button"
                  >
                    登录 / 注册
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>

        {children}

        <SettingsModal
          isOpen={isSettingsOpen}
          isSaving={isSavingSettings}
          settings={settingsDraft}
          message={settingsMessage}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
          onSettingsChange={setSettingsDraft}
        />
        <AuthModal
          isOpen={isAuthOpen}
          isSubmitting={isAuthSubmitting}
          mode={authMode}
          email={authEmail}
          password={authPassword}
          displayName={authDisplayName}
          message={authMessage}
          onClose={handleCloseAuth}
          onEmailChange={setAuthEmail}
          onPasswordChange={setAuthPassword}
          onDisplayNameChange={setAuthDisplayName}
          onModeChange={setAuthMode}
          onSubmit={handleSubmitAuth}
        />
      </div>
    </SessionProvider>
  );
}
