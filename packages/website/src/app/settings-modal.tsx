'use client';

import AiProviderPanel from './ai-provider-panel';
import type { UserSettings } from '../lib/session/session-types';

export type SettingsModalProps = {
  isOpen: boolean;
  isSaving: boolean;
  settings: UserSettings;
  message: string;
  onClose: () => void;
  onSave: () => void;
  onSettingsChange: (settings: UserSettings) => void;
};

export default function SettingsModal({
  isOpen,
  isSaving,
  settings,
  message,
  onClose,
  onSave,
  onSettingsChange,
}: SettingsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,10,8,0.45)] p-4">
      <div className="panel-card w-full max-w-xl rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">设置</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">个人偏好</h2>
            <p className="text-sm text-[var(--ink-muted)]">模型配置与个人习惯。</p>
          </div>
          <button
            className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-4">
          <AiProviderPanel
            provider={settings.provider}
            model={settings.model}
            onProviderChange={(provider) => onSettingsChange({ ...settings, provider })}
            onModelChange={(model) => onSettingsChange({ ...settings, model })}
          />
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
            disabled={isSaving}
            onClick={onSave}
            type="button"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
}
