'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AppShell from '../../app-shell';
import ConfirmDialog from '../../confirm-dialog';
import type { DmGuidePhase, DmProfileDetail, DmProfileRule, DmProfileSummary } from '../../../lib/game/types';
import { useSession } from '../../../lib/session/session-context';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Textarea } from '../../../components/ui/textarea';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

const phaseOptions: Array<{ value: DmGuidePhase; label: string }> = [
  { value: 'analysis', label: '初步验证' },
  { value: 'narration', label: '具体叙事' },
];

type ProfileDraft = {
  name: string;
  summary: string;
  analysisGuide: string;
  narrationGuide: string;
  isDefault: boolean;
};

type RuleDraft = {
  phase: DmGuidePhase;
  category: string;
  title: string;
  content: string;
  order: number;
  isEnabled: boolean;
};

function buildProfileDraft(profile: DmProfileDetail | null): ProfileDraft {
  if (!profile) {
    return {
      name: '',
      summary: '',
      analysisGuide: '',
      narrationGuide: '',
      isDefault: false,
    };
  }
  return {
    name: profile.name,
    summary: profile.summary,
    analysisGuide: profile.analysisGuide,
    narrationGuide: profile.narrationGuide,
    isDefault: profile.isDefault,
  };
}

function buildRuleDraft(): RuleDraft {
  return {
    phase: 'analysis',
    category: '',
    title: '',
    content: '',
    order: 0,
    isEnabled: true,
  };
}

function buildRuleRequest(rule: DmProfileRule) {
  return {
    phase: rule.phase,
    category: rule.category,
    title: rule.title,
    content: rule.content,
    order: rule.order,
    isEnabled: rule.isEnabled,
  };
}

function formatUpdatedAt(value: string): string {
  if (!value) {
    return '';
  }
  return value.replace('T', ' ').slice(0, 16);
}

function AdminDmProfilesContent() {
  const { session, requestAuth } = useSession();
  const isRoot = session?.isRoot ?? false;
  const [profiles, setProfiles] = useState<DmProfileSummary[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [activeProfile, setActiveProfile] = useState<DmProfileDetail | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(buildProfileDraft(null));
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(buildRuleDraft());
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<DmProfileRule | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<DmProfileSummary | null>(null);
  const [createName, setCreateName] = useState('');
  const [createSummary, setCreateSummary] = useState('');
  const [createAnalysisGuide, setCreateAnalysisGuide] = useState('');
  const [createNarrationGuide, setCreateNarrationGuide] = useState('');

  const activeRules = activeProfile?.rules ?? [];
  const activeProfileName = activeProfile?.name ?? '';
  const displayStatus = statusMessage || (isLoading ? '正在加载...' : '');

  const sortedRules = useMemo(() => {
    return [...activeRules].sort((a, b) => a.order - b.order);
  }, [activeRules]);

  const loadProfiles = useCallback(async () => {
    if (!isRoot) {
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
      const list = data.profiles ?? [];
      setProfiles(list);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DM 风格列表读取失败';
      setStatusMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [isRoot]);

  const loadProfileDetail = useCallback(async (profileId: string) => {
    setIsLoading(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${profileId}`, { cache: 'no-store' });
      const data = (await response.json()) as { profile?: DmProfileDetail; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? 'DM 风格读取失败');
      }
      setActiveProfile(data.profile);
      setProfileDraft(buildProfileDraft(data.profile));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'DM 风格读取失败';
      setStatusMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      setActiveProfileId(profiles[0].id);
    }
  }, [activeProfileId, profiles]);

  useEffect(() => {
    if (!activeProfileId) {
      setActiveProfile(null);
      setProfileDraft(buildProfileDraft(null));
      return;
    }
    loadProfileDetail(activeProfileId);
  }, [activeProfileId, loadProfileDetail]);

  function handleSelectProfile(profileId: string) {
    setActiveProfileId(profileId);
  }

  function handleRequestAuth() {
    requestAuth();
  }

  function handleCreateProfileInput(value: string, field: 'name' | 'summary' | 'analysis' | 'narration') {
    if (field === 'name') {
      setCreateName(value);
    } else if (field === 'summary') {
      setCreateSummary(value);
    } else if (field === 'analysis') {
      setCreateAnalysisGuide(value);
    } else {
      setCreateNarrationGuide(value);
    }
  }

  async function handleCreateProfile() {
    const name = createName.trim();
    const summary = createSummary.trim();
    if (!name || !summary) {
      setStatusMessage('请填写 DM 名称与简介。');
      return;
    }
    setIsSavingProfile(true);
    setStatusMessage('');
    try {
      const response = await fetch('/api/admin/dm-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          summary,
          analysisGuide: createAnalysisGuide.trim(),
          narrationGuide: createNarrationGuide.trim(),
        }),
      });
      const data = (await response.json()) as {
        profile?: DmProfileSummary & { analysisGuide?: string; narrationGuide?: string };
        error?: string;
      };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? '创建 DM 风格失败');
      }
      const summaryProfile: DmProfileSummary = {
        id: data.profile.id,
        name: data.profile.name,
        summary: data.profile.summary,
        isDefault: data.profile.isDefault,
      };
      setProfiles((current) => [summaryProfile, ...current]);
      setActiveProfileId(data.profile.id);
      setCreateName('');
      setCreateSummary('');
      setCreateAnalysisGuide('');
      setCreateNarrationGuide('');
      setStatusMessage('DM 风格已创建。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建 DM 风格失败';
      setStatusMessage(message);
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleProfileDraftChange(field: keyof ProfileDraft, value: string | boolean) {
    setProfileDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveProfile() {
    if (!activeProfile) {
      return;
    }
    setIsSavingProfile(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${activeProfile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileDraft),
      });
      const data = (await response.json()) as { profile?: DmProfileDetail; error?: string };
      if (!response.ok || !data.profile) {
        throw new Error(data.error ?? '保存 DM 风格失败');
      }
      setActiveProfile(data.profile);
      setProfileDraft(buildProfileDraft(data.profile));
      setProfiles((current) =>
        current.map((profile) => {
          if (profile.id === data.profile?.id) {
            return {
              ...profile,
              name: data.profile.name,
              summary: data.profile.summary,
              isDefault: data.profile.isDefault,
            };
          }
          if (data.profile?.isDefault) {
            return { ...profile, isDefault: false };
          }
          return profile;
        }),
      );
      setStatusMessage('DM 风格已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存 DM 风格失败';
      setStatusMessage(message);
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleUpdateRule(ruleId: string, field: keyof RuleDraft, value: string | number | boolean) {
    if (!activeProfile) {
      return;
    }
    setActiveProfile((current) => {
      if (!current) {
        return current;
      }
      const nextRules = current.rules.map((rule) => (rule.id === ruleId ? { ...rule, [field]: value } : rule));
      return { ...current, rules: nextRules };
    });
  }

  async function handleSaveRule(ruleId: string) {
    if (!activeProfile) {
      return;
    }
    const rule = activeProfile.rules.find((item) => item.id === ruleId);
    if (!rule) {
      return;
    }
    setIsSavingRule(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${activeProfile.id}/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRuleRequest(rule)),
      });
      const data = (await response.json()) as { rule?: DmProfileRule; error?: string };
      if (!response.ok || !data.rule) {
        throw new Error(data.error ?? '保存规则失败');
      }
      setActiveProfile((current) => {
        if (!current) {
          return current;
        }
        const nextRules = current.rules.map((item) => (item.id === ruleId ? data.rule : item));
        return { ...current, rules: nextRules };
      });
      setStatusMessage('规则已保存。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存规则失败';
      setStatusMessage(message);
    } finally {
      setIsSavingRule(false);
    }
  }

  async function handleCreateRule() {
    if (!activeProfile) {
      return;
    }
    if (!ruleDraft.title.trim() || !ruleDraft.content.trim()) {
      setStatusMessage('请填写规则标题和内容。');
      return;
    }
    setIsSavingRule(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${activeProfile.id}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleDraft),
      });
      const data = (await response.json()) as { rule?: DmProfileRule; error?: string };
      if (!response.ok || !data.rule) {
        throw new Error(data.error ?? '新增规则失败');
      }
      setActiveProfile((current) => (current ? { ...current, rules: [...current.rules, data.rule] } : current));
      setRuleDraft(buildRuleDraft());
      setStatusMessage('规则已新增。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '新增规则失败';
      setStatusMessage(message);
    } finally {
      setIsSavingRule(false);
    }
  }

  function handleAskDeleteRule(rule: DmProfileRule) {
    setDeleteRuleTarget(rule);
  }

  function handleCancelDeleteRule() {
    setDeleteRuleTarget(null);
  }

  async function handleConfirmDeleteRule() {
    if (!activeProfile || !deleteRuleTarget) {
      return;
    }
    setIsSavingRule(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${activeProfile.id}/rules/${deleteRuleTarget.id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '删除规则失败');
      }
      setActiveProfile((current) =>
        current ? { ...current, rules: current.rules.filter((rule) => rule.id !== deleteRuleTarget.id) } : current,
      );
      setStatusMessage('规则已删除。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除规则失败';
      setStatusMessage(message);
    } finally {
      setIsSavingRule(false);
      setDeleteRuleTarget(null);
    }
  }

  function handleAskDeleteProfile(profile: DmProfileSummary) {
    setDeleteProfileTarget(profile);
  }

  function handleCancelDeleteProfile() {
    setDeleteProfileTarget(null);
  }

  async function handleConfirmDeleteProfile() {
    if (!deleteProfileTarget) {
      return;
    }
    setIsSavingProfile(true);
    setStatusMessage('');
    try {
      const response = await fetch(`/api/admin/dm-profiles/${deleteProfileTarget.id}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? '删除 DM 风格失败');
      }
      setProfiles((current) => current.filter((profile) => profile.id !== deleteProfileTarget.id));
      if (activeProfileId === deleteProfileTarget.id) {
        setActiveProfileId(null);
        setActiveProfile(null);
        setProfileDraft(buildProfileDraft(null));
      }
      setStatusMessage('DM 风格已删除。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除 DM 风格失败';
      setStatusMessage(message);
    } finally {
      setIsSavingProfile(false);
      setDeleteProfileTarget(null);
    }
  }

  if (!session) {
    return (
      <section className="panel-card flex flex-col gap-4 rounded-xl p-3 sm:p-4 lg:h-full">
        <div>
          <p className={sectionTitleClassName}>全局配置</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">DM 风格管理</h2>
          <p className="text-sm text-[var(--ink-muted)]">登录后可查看与编辑。</p>
        </div>
        <Button onClick={handleRequestAuth} size="sm">
          登录 / 注册
        </Button>
      </section>
    );
  }

  if (!isRoot) {
    return (
      <section className="panel-card flex flex-col gap-4 rounded-xl p-3 sm:p-4 lg:h-full">
        <div>
          <p className={sectionTitleClassName}>全局配置</p>
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">DM 风格管理</h2>
          <p className="text-sm text-[var(--ink-muted)]">需要 root 权限。</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="grid gap-4 p-3 sm:p-4 lg:h-full lg:grid-cols-[16rem_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="panel-card flex flex-col gap-4 rounded-xl p-3 sm:p-4 lg:h-full lg:overflow-hidden">
          <div>
            <p className={sectionTitleClassName}>DM 列表</p>
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">风格集合</h2>
            <p className="text-xs text-[var(--ink-muted)]">选择一个风格开始编辑。</p>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {profiles.length === 0 ? (
              <p className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 text-xs text-[var(--ink-soft)]">
                暂无 DM 风格
              </p>
            ) : (
              profiles.map((profile) => (
                <div
                  className={`rounded-lg border border-[rgba(27,20,12,0.08)] p-3 text-xs ${
                    activeProfileId === profile.id ? 'bg-[rgba(255,255,255,0.85)]' : 'bg-[rgba(255,255,255,0.6)]'
                  }`}
                  key={profile.id}
                >
                  <Button
                    className="w-full justify-start text-sm"
                    onClick={() => handleSelectProfile(profile.id)}
                    size="xs"
                    variant={activeProfileId === profile.id ? 'default' : 'outline'}
                  >
                    {profile.name}
                  </Button>
                  <p className="mt-1 text-[10px] text-[var(--ink-soft)]">{profile.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {profile.isDefault ? (
                      <span className="rounded-md border border-[rgba(27,20,12,0.12)] px-2 py-0.5 text-[10px] text-[var(--ink-soft)]">
                        默认
                      </span>
                    ) : null}
                    <Button onClick={() => handleAskDeleteProfile(profile)} size="xs" variant="destructive-outline">
                      删除
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3 text-xs">
            <p className="text-xs font-semibold text-[var(--ink-strong)]">新建 DM 风格</p>
            <div className="mt-2 space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--ink-soft)]" htmlFor="create-name">
                  名称
                </Label>
                <Input
                  id="create-name"
                  size="sm"
                  value={createName}
                  onChange={(event) => handleCreateProfileInput(event.target.value, 'name')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--ink-soft)]" htmlFor="create-summary">
                  简介
                </Label>
                <Input
                  id="create-summary"
                  size="sm"
                  value={createSummary}
                  onChange={(event) => handleCreateProfileInput(event.target.value, 'summary')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--ink-soft)]" htmlFor="create-analysis">
                  初步验证（基础）
                </Label>
                <Textarea
                  id="create-analysis"
                  rows={3}
                  value={createAnalysisGuide}
                  onChange={(event) => handleCreateProfileInput(event.target.value, 'analysis')}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-[var(--ink-soft)]" htmlFor="create-narration">
                  具体叙事（基础）
                </Label>
                <Textarea
                  id="create-narration"
                  rows={3}
                  value={createNarrationGuide}
                  onChange={(event) => handleCreateProfileInput(event.target.value, 'narration')}
                />
              </div>
              <Button disabled={isSavingProfile} onClick={handleCreateProfile} size="xs">
                {isSavingProfile ? '创建中...' : '创建风格'}
              </Button>
            </div>
          </div>
        </aside>

        <section className="panel-card flex flex-col gap-4 rounded-xl p-3 sm:p-4 lg:h-full lg:overflow-hidden">
          <div>
            <p className={sectionTitleClassName}>全局配置</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">{activeProfileName || '请选择 DM 风格'}</h2>
            <p className="text-sm text-[var(--ink-muted)]">
              {activeProfile ? '编辑基础指南与规则集合。' : '从左侧选择一个风格开始编辑。'}
            </p>
            {displayStatus ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{displayStatus}</p> : null}
          </div>

          {activeProfile ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--ink-soft)]" htmlFor="profile-name">
                      名称
                    </Label>
                    <Input
                      id="profile-name"
                      size="sm"
                      value={profileDraft.name}
                      onChange={(event) => handleProfileDraftChange('name', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--ink-soft)]" htmlFor="profile-summary">
                      简介
                    </Label>
                    <Input
                      id="profile-summary"
                      size="sm"
                      value={profileDraft.summary}
                      onChange={(event) => handleProfileDraftChange('summary', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs text-[var(--ink-soft)]" htmlFor="profile-analysis">
                      初步验证（基础）
                    </Label>
                    <Textarea
                      id="profile-analysis"
                      rows={4}
                      value={profileDraft.analysisGuide}
                      onChange={(event) => handleProfileDraftChange('analysisGuide', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs text-[var(--ink-soft)]" htmlFor="profile-narration">
                      具体叙事（基础）
                    </Label>
                    <Textarea
                      id="profile-narration"
                      rows={4}
                      value={profileDraft.narrationGuide}
                      onChange={(event) => handleProfileDraftChange('narrationGuide', event.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={profileDraft.isDefault}
                      id="profile-default"
                      onCheckedChange={(checked) => handleProfileDraftChange('isDefault', checked)}
                    />
                    <Label className="text-xs text-[var(--ink-soft)]" htmlFor="profile-default">
                      设为默认风格
                    </Label>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button disabled={isSavingProfile} onClick={handleSaveProfile} size="sm">
                    {isSavingProfile ? '保存中...' : '保存基础指南'}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">规则集合</p>
                    <h3 className="text-lg font-semibold text-[var(--ink-strong)]">具体指导原则</h3>
                    <p className="text-xs text-[var(--ink-muted)]">建议保持简短且可执行。</p>
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {sortedRules.length === 0 ? (
                    <p className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-3 text-xs text-[var(--ink-soft)]">
                      暂无规则
                    </p>
                  ) : (
                    sortedRules.map((rule) => (
                      <div
                        className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs"
                        key={rule.id}
                      >
                        <div className="grid gap-3 lg:grid-cols-[8rem_1fr_5rem_6rem]">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-[var(--ink-soft)]">阶段</Label>
                            <Select
                              value={rule.phase}
                              onValueChange={(value) => handleUpdateRule(rule.id, 'phase', value)}
                            >
                              <SelectTrigger size="sm">
                                <SelectValue placeholder="选择阶段" />
                              </SelectTrigger>
                              <SelectContent>
                                {phaseOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-[var(--ink-soft)]">分类</Label>
                            <Input
                              size="sm"
                              value={rule.category}
                              onChange={(event) => handleUpdateRule(rule.id, 'category', event.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-[var(--ink-soft)]">排序</Label>
                            <Input
                              size="sm"
                              type="number"
                              value={String(rule.order)}
                              onChange={(event) => handleUpdateRule(rule.id, 'order', Number(event.target.value || 0))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-[var(--ink-soft)]">启用</Label>
                            <Switch
                              checked={rule.isEnabled}
                              onCheckedChange={(checked) => handleUpdateRule(rule.id, 'isEnabled', checked)}
                            />
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] text-[var(--ink-soft)]">标题</Label>
                            <Input
                              size="sm"
                              value={rule.title}
                              onChange={(event) => handleUpdateRule(rule.id, 'title', event.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-[var(--ink-soft)]">内容</Label>
                            <Textarea
                              rows={2}
                              value={rule.content}
                              onChange={(event) => handleUpdateRule(rule.id, 'content', event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button disabled={isSavingRule} onClick={() => handleSaveRule(rule.id)} size="xs">
                            保存规则
                          </Button>
                          <Button onClick={() => handleAskDeleteRule(rule)} size="xs" variant="destructive-outline">
                            删除规则
                          </Button>
                          <span className="text-[10px] text-[var(--ink-soft)]">
                            更新于 {formatUpdatedAt(rule.updatedAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">新增规则</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-[8rem_1fr_5rem_6rem]">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">阶段</Label>
                    <Select
                      value={ruleDraft.phase}
                      onValueChange={(value) =>
                        setRuleDraft((current) => ({ ...current, phase: value as DmGuidePhase }))
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue placeholder="选择阶段" />
                      </SelectTrigger>
                      <SelectContent>
                        {phaseOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">分类</Label>
                    <Input
                      size="sm"
                      value={ruleDraft.category}
                      onChange={(event) => setRuleDraft((current) => ({ ...current, category: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">排序</Label>
                    <Input
                      size="sm"
                      type="number"
                      value={String(ruleDraft.order)}
                      onChange={(event) =>
                        setRuleDraft((current) => ({ ...current, order: Number(event.target.value || 0) }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">启用</Label>
                    <Switch
                      checked={ruleDraft.isEnabled}
                      onCheckedChange={(checked) => setRuleDraft((current) => ({ ...current, isEnabled: checked }))}
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">标题</Label>
                    <Input
                      size="sm"
                      value={ruleDraft.title}
                      onChange={(event) => setRuleDraft((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">内容</Label>
                    <Textarea
                      rows={2}
                      value={ruleDraft.content}
                      onChange={(event) => setRuleDraft((current) => ({ ...current, content: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Button disabled={isSavingRule} onClick={handleCreateRule} size="sm">
                    {isSavingRule ? '新增中...' : '新增规则'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteRuleTarget)}
        title="删除规则"
        description={deleteRuleTarget ? `确定删除规则「${deleteRuleTarget.title}」吗？` : ''}
        confirmLabel="删除规则"
        isProcessing={isSavingRule}
        onCancel={handleCancelDeleteRule}
        onConfirm={handleConfirmDeleteRule}
      />
      <ConfirmDialog
        isOpen={Boolean(deleteProfileTarget)}
        title="删除 DM 风格"
        description={deleteProfileTarget ? `确定删除「${deleteProfileTarget.name}」吗？` : ''}
        confirmLabel="删除风格"
        isProcessing={isSavingProfile}
        onCancel={handleCancelDeleteProfile}
        onConfirm={handleConfirmDeleteProfile}
      />
    </>
  );
}

export default function AdminDmProfilesPage() {
  return (
    <AppShell activeNav="admin">
      <AdminDmProfilesContent />
    </AppShell>
  );
}
