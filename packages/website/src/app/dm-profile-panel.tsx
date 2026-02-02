'use client';

import { useMemo } from 'react';
import type { DmProfileSummary } from '../lib/game/types';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export type DmProfilePanelProps = {
  profiles: DmProfileSummary[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  isDisabled?: boolean;
};

function resolveDefaultProfile(profiles: DmProfileSummary[]): DmProfileSummary | null {
  return profiles.find((profile) => profile.isDefault) ?? profiles[0] ?? null;
}

export default function DmProfilePanel({ profiles, value, onChange, isDisabled = false }: DmProfilePanelProps) {
  const defaultProfile = useMemo(() => resolveDefaultProfile(profiles), [profiles]);
  const selectedId = value ?? defaultProfile?.id ?? '';
  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedId) ?? defaultProfile,
    [profiles, selectedId, defaultProfile],
  );

  function handleProfileChange(nextValue: string | null) {
    onChange?.(nextValue || null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">主持风格</p>
          <h2 className="font-[var(--font-display)] text-xl text-[var(--ink-strong)]">DM 指南</h2>
        </div>
        {defaultProfile ? (
          <Badge className="px-3 py-1 text-xs text-[var(--ink-soft)]" variant="outline">
            默认风格
          </Badge>
        ) : null}
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-[var(--ink-soft)]" htmlFor="dm-profile">
          选择 DM 风格
        </Label>
        <Select value={selectedId} onValueChange={handleProfileChange} disabled={isDisabled || profiles.length === 0}>
          <SelectTrigger aria-label="DM 风格" className="bg-[rgba(255,255,255,0.75)]" id="dm-profile" size="sm">
            <SelectValue placeholder="暂无可用 DM 风格" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profile.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--ink-muted)]">{activeProfile?.summary ?? '暂无 DM 风格描述。'}</p>
      </div>
    </div>
  );
}
