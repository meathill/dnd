'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthModal from './auth-modal';
import SettingsModal from './settings-modal';
import { authClient } from '../lib/auth/auth-client';
import type { SessionInfo, UserSettings } from '../lib/session/session-types';
import { SessionProvider } from '../lib/session/session-context';
import { MenuIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import type { DmProfileSummary } from '../lib/game/types';
import { Sheet, SheetPanel, SheetPopup } from '../components/ui/sheet';
import { getDefaultModel, normalizeModel } from '../lib/ai/ai-models';

const sidebarTitleClassName = 'text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]';

const defaultSettings: UserSettings = {
  provider: 'openai',
  fastModel: getDefaultModel('openai', 'fast'),
  generalModel: getDefaultModel('openai', 'general'),
  dmProfileId: null,
};

type AppShellProps = {
  activeNav: 'home' | 'script' | 'game' | 'games' | 'admin-dm' | 'admin-scripts';
  scriptId?: string | null;
  gameId?: string | null;
  children: ReactNode;
};

export default function AppShell({ activeNav, scriptId, gameId, children }: AppShellProps) {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<UserSettings>(defaultSettings);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [allowSignUp, setAllowSignUp] = useState(true);
  const [dmProfiles, setDmProfiles] = useState<DmProfileSummary[]>([]);
  const [dmProfilesMessage, setDmProfilesMessage] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authSuccessAction, setAuthSuccessAction] = useState<null | (() => void)>(null);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const isLoggedIn = Boolean(session);

  const loadSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (!response.ok) {
        setSession(null);
        return null;
      }
      const data = (await response.json()) as { session?: SessionInfo | null; allowSignUp?: boolean };
      const nextSession = data.session ?? null;
      setSession(nextSession);
      setAllowSignUp(Boolean(data.allowSignUp ?? true));
      return nextSession;
    } catch {
      setSession(null);
      return null;
    }
  }, []);

  function normalizeSettings(settings: UserSettings | null): UserSettings {
    if (!settings) {
      return defaultSettings;
    }
    const provider = settings.provider ?? defaultSettings.provider;
    return {
      provider,
      fastModel: normalizeModel(provider, 'fast', settings.fastModel),
      generalModel: normalizeModel(provider, 'general', settings.generalModel),
      dmProfileId: settings.dmProfileId ?? null,
    };
  }

  const loadDmProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/dm-profiles', { cache: 'no-store' });
      if (!response.ok) {
        setDmProfiles([]);
        setDmProfilesMessage('DM 风格列表加载失败。');
        return [];
      }
      const data = (await response.json()) as { profiles?: DmProfileSummary[] };
      const profiles = Array.isArray(data.profiles) ? data.profiles : [];
      setDmProfiles(profiles);
      setDmProfilesMessage('');
      return profiles;
    } catch {
      setDmProfiles([]);
      setDmProfilesMessage('DM 风格列表加载失败。');
      return [];
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!isSettingsOpen) {
      return;
    }
    loadDmProfiles();
  }, [isSettingsOpen, loadDmProfiles]);

  useEffect(() => {
    if (!allowSignUp && authMode === 'signUp') {
      setAuthMode('signIn');
    }
  }, [allowSignUp, authMode]);

  function handleOpenGames() {
    handleRequestAuth(() => {
      router.push('/games');
    });
  }

  function handleOpenSettings() {
    if (!session) {
      return;
    }
    setSettingsDraft(normalizeSettings(session.settings));
    setSettingsMessage('');
    setDmProfilesMessage('');
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
    setAuthSuccessAction(null);
  }

  async function handleSubmitAuth() {
    if (!allowSignUp && authMode === 'signUp') {
      setAuthMessage('当前禁止注册，请联系管理员。');
      return;
    }
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
      const nextSession = await loadSession();
      if (nextSession) {
        setIsAuthOpen(false);
        const nextAction = authSuccessAction;
        setAuthSuccessAction(null);
        if (nextAction) {
          nextAction();
        }
      }
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

  function handleRequestAuth(onSuccess?: () => void) {
    if (session) {
      if (onSuccess) {
        onSuccess();
      }
      return;
    }
    setAuthSuccessAction(() => (onSuccess ? onSuccess : null));
    handleOpenAuth();
  }

  const sidebarContent = (
    <>
      <div className="space-y-3">
        <p className={sidebarTitleClassName}>AI 跑团体验 · COC 模式</p>
        <h1 className="text-3xl text-[var(--ink-strong)] sm:text-4xl font-[var(--font-accent)]">肉团长</h1>
        <p className="text-sm text-[var(--ink-muted)]">导航与账号入口，随时切换不同阶段。</p>
      </div>

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">导航</p>
        <Button
          className="w-full justify-start"
          render={<Link href="/" />}
          size="sm"
          variant={activeNav === 'home' ? 'default' : 'outline'}
        >
          首页
        </Button>
        <Button
          className="w-full justify-start"
          onClick={handleOpenGames}
          disabled={!isLoggedIn}
          size="sm"
          variant={activeNav === 'games' ? 'default' : 'outline'}
        >
          游戏记录
        </Button>
        <Button
          className="w-full justify-start"
          onClick={handleOpenSettings}
          disabled={!isLoggedIn}
          size="sm"
          variant="outline"
        >
          设置
        </Button>
        {isLoggedIn ? (
          <>
            <Button
              className="w-full justify-start"
              render={<Link href="/admin/dm-profiles" />}
              size="sm"
              variant={activeNav === 'admin-dm' ? 'default' : 'outline'}
            >
              全局配置
            </Button>
            <Button
              className="w-full justify-start"
              render={<Link href="/admin/scripts" />}
              size="sm"
              variant={activeNav === 'admin-scripts' ? 'default' : 'outline'}
            >
              剧本编辑器
            </Button>
          </>
        ) : null}
      </div>

      <div className="mt-auto space-y-2 text-xs text-[var(--ink-soft)]">
        <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3">
          <p className="font-semibold text-[var(--ink-strong)]">账号状态</p>
          <p className="mt-2">{isLoggedIn ? `已登录：${session?.displayName}` : '未登录'}</p>
          <p className="mt-1">登录后可使用设置与保存记录。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {isLoggedIn ? (
              <Button onClick={handleSignOut} size="xs" variant="outline">
                退出登录
              </Button>
            ) : (
              <Button onClick={handleOpenAuth} size="xs">
                {allowSignUp ? '登录 / 注册' : '登录'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );

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
    <SessionProvider value={{ session, reloadSession: loadSession, requestAuth: handleRequestAuth }}>
      <div className="min-h-screen lg:h-screen lg:overflow-hidden">
        <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.92)] px-3 py-3 backdrop-blur lg:hidden">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--ink-soft)]">AI 跑团体验</p>
              <h1 className="text-lg font-semibold text-[var(--ink-strong)]">肉团长</h1>
            </div>
            <Button size="icon" variant="outline" onClick={() => setIsNavOpen(true)} aria-label="打开导航">
              <MenuIcon />
            </Button>
          </header>
          <aside
            className="panel-card border-r animate-[fade-up_0.7s_ease-out_both] hidden w-full flex-col gap-4 p-4 lg:flex lg:h-dvh lg:max-h-dvh lg:overflow-auto"
            style={{ animationDelay: '0.05s' }}
          >
            {sidebarContent}
          </aside>

          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">{children}</main>
        </div>

        <SettingsModal
          isOpen={isSettingsOpen}
          isSaving={isSavingSettings}
          settings={settingsDraft}
          message={settingsMessage}
          dmProfiles={dmProfiles}
          dmProfilesMessage={dmProfilesMessage}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
          onSettingsChange={setSettingsDraft}
        />
        <AuthModal
          isOpen={isAuthOpen}
          isSubmitting={isAuthSubmitting}
          mode={authMode}
          isSignUpEnabled={allowSignUp}
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
        <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
          <SheetPopup side="left" showCloseButton>
            <SheetPanel className="flex min-h-0 flex-1 flex-col gap-4">{sidebarContent}</SheetPanel>
          </SheetPopup>
        </Sheet>
      </div>
    </SessionProvider>
  );
}
