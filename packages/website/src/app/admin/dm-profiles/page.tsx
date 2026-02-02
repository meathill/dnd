'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/app/app-shell';
import { useSession } from '@/lib/session/session-context';
import type { DmProfileSummary } from '@/lib/game/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 py-3 sm:py-4 lg:h-full lg:max-h-dvh';

type DmProfileCreateDraft = {
  name: string;
  summary: string;
  isDefault: boolean;
};

function buildCreateDraft(): DmProfileCreateDraft {
  return {
    name: '',
    summary: '',
    isDefault: false,
  };
}

function formatProfileLabel(profile: DmProfileSummary): string {
  return profile.name || '未命名风格';
}

export function AdminDmProfilesContent() {
  const router = useRouter();
  const { session, requestAuth } = useSession();
  const [profiles, setProfiles] = useState<DmProfileSummary[]>([]);
  const [createDraft, setCreateDraft] = useState<DmProfileCreateDraft>(buildCreateDraft());
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const displayStatus = statusMessage || (isLoading ? '正在加载...' : '');

  const profileOptions = useMemo(() => {
    return [...profiles].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
  }, [profiles]);

  const loadProfiles = useCallback(
    async function loadProfiles() {
      if (!session) {
        return;
      }
      setIsLoading(true);
      setStatusMessage('');
      try {
        const response = await fetch('/api/admin/dm-profiles', { cache: 'no-store' });
        const data = (await response.json()) as { profiles?: DmProfileSummary[]; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? 'DM 风格列表读取失败');
        }
        setProfiles(data.profiles ?? []);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'DM 风格列表读取失败';
        setStatusMessage(message);
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  function handleRequestAuth() {
    requestAuth();
  }

  function handleCreateDraftChange(value: string, field: 'name' | 'summary') {
    setCreateDraft((current) => ({ ...current, [field]: value }));
  }

  function handleDefaultToggle(isDefault: boolean) {
    setCreateDraft((current) => ({ ...current, isDefault }));
  }

  async function handleCreateProfile() {
    const name = createDraft.name.trim();
    const summary = createDraft.summary.trim();
    if (!name || !summary) {
      setStatusMessage('请完整填写 DM 风格名称与简介。');
      return;
    }
    setIsCreating(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/admin/dm-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          summary,
          isDefault: createDraft.isDefault,
        }),
      });
      const data = (await response.json()) as { profile?: DmProfileSummary; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? 'DM 风格创建失败');
      }
      setCreateDraft(buildCreateDraft());
      router.push(`/admin/dm-profiles/${data.profile.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DM 风格创建失败';
      setStatusMessage(message);
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenProfile(profileId: string) {
    router.push(`/admin/dm-profiles/${profileId}`);
  }

  if (!session) {
    return (
      <section className={panelClassName}>
        <p className={sectionTitleClassName}>DM 风格</p>
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">需要登录</h2>
        <p className="text-sm text-[var(--ink-muted)]">请先登录后再管理 DM 风格。</p>
        <Button onClick={handleRequestAuth} size="sm">
          登录 / 注册
        </Button>
      </section>
    );
  }

  return (
    <div className="grid px-4 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:overflow-hidden">
      <section className={`${panelClassName} lg:overflow-auto`}>
        <div>
          <p className={sectionTitleClassName}>新建风格</p>
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">基础信息</h2>
          <p className="text-xs text-[var(--ink-muted)]">创建后进入风格编辑页。</p>
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]" htmlFor="dm-profile-name">
            风格名称
          </Label>
          <Input
            id="dm-profile-name"
            value={createDraft.name}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'name')}
            placeholder="例如：温和推进"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-[var(--ink-muted)]" htmlFor="dm-profile-summary">
            简介
          </Label>
          <Textarea
            id="dm-profile-summary"
            value={createDraft.summary}
            onChange={(event) => handleCreateDraftChange(event.target.value, 'summary')}
            placeholder="简短描述风格特点"
            rows={3}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3">
          <div>
            <p className="text-xs font-semibold text-[var(--ink-strong)]">设为默认风格</p>
            <p className="text-[10px] text-[var(--ink-soft)]">默认风格会在设置中自动选中。</p>
          </div>
          <Switch checked={createDraft.isDefault} onCheckedChange={handleDefaultToggle} aria-label="设为默认风格" />
        </div>
        <Button disabled={isCreating} onClick={handleCreateProfile} size="sm">
          {isCreating ? '创建中...' : '创建风格'}
        </Button>
        {displayStatus ? <p className="text-xs text-[var(--accent-ember)]">{displayStatus}</p> : null}
      </section>

      <section className={`${panelClassName} lg:overflow-auto`}>
        <div>
          <p className={sectionTitleClassName}>DM 风格</p>
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">已有风格</h2>
          <p className="text-xs text-[var(--ink-muted)]">选择风格进入编辑模式。</p>
        </div>
        {profileOptions.length === 0 ? (
          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 text-xs text-[var(--ink-soft)]">
            暂无 DM 风格，请先创建。
          </div>
        ) : (
          <div className="space-y-3">
            {profileOptions.map((profile) => (
              <div
                className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3 text-sm"
                key={profile.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--ink-strong)]">{formatProfileLabel(profile)}</p>
                      {profile.isDefault ? (
                        <Badge className="px-2 py-1 text-[10px]" variant="outline">
                          默认
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-muted)]">{profile.summary}</p>
                    <p className="mt-1 text-[10px] text-[var(--ink-soft)]">编号：{profile.id}</p>
                  </div>
                  <Button onClick={() => handleOpenProfile(profile.id)} size="sm" variant="outline">
                    编辑
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function AdminDmProfilesPage() {
  return (
    <AppShell activeNav="admin-dm">
      <AdminDmProfilesContent />
    </AppShell>
  );
}
