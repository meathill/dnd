'use client';

import AiProviderPanel from './ai-provider-panel';
import DmProfilePanel from './dm-profile-panel';
import type { UserSettings } from '../lib/session/session-types';
import type { DmProfileSummary } from '../lib/game/types';
import { Button } from '../components/ui/button';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '../components/ui/dialog';

export type SettingsModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  settings: UserSettings;
  message: string;
  dmProfiles: DmProfileSummary[];
  dmProfilesMessage: string;
  onClose: () => void;
  onSave: () => void;
  onSettingsChange: (settings: UserSettings) => void;
};

export default function SettingsModal({
  isOpen,
  isSaving,
  settings,
  message,
  dmProfiles,
  dmProfilesMessage,
  onClose,
  onSave,
  onSettingsChange,
}: SettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogPopup className="max-w-xl" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">设置</p>
            <DialogTitle className="text-xl font-semibold text-[var(--ink-strong)]">个人偏好</DialogTitle>
            <p className="text-sm text-[var(--ink-muted)]">模型配置与个人习惯。</p>
          </div>
          <Button onClick={onClose} size="sm" variant="outline">
            关闭
          </Button>
        </DialogHeader>

        <DialogPanel className="space-y-3">
          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
            <AiProviderPanel
              provider={settings.provider}
              fastModel={settings.fastModel}
              generalModel={settings.generalModel}
              onProviderChange={(provider) => onSettingsChange({ ...settings, provider })}
              onFastModelChange={(fastModel) => onSettingsChange({ ...settings, fastModel })}
              onGeneralModelChange={(generalModel) => onSettingsChange({ ...settings, generalModel })}
            />
          </div>
          <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
            <DmProfilePanel
              profiles={dmProfiles}
              value={settings.dmProfileId}
              onChange={(dmProfileId) => onSettingsChange({ ...settings, dmProfileId })}
            />
            {dmProfilesMessage ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{dmProfilesMessage}</p> : null}
          </div>
          {message ? <p className="text-xs text-[var(--accent-ember)]">{message}</p> : null}
        </DialogPanel>

        <DialogFooter className="justify-end" variant="bare">
          <Button onClick={onClose} size="sm" variant="outline">
            取消
          </Button>
          <Button disabled={isSaving} onClick={onSave} size="sm">
            {isSaving ? '保存中...' : '保存设置'}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
