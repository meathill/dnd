'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import type { AiProvider } from '../lib/ai/ai-types';

const providerOptions = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-5-mini',
    description: '稳定通用，适合叙事与规则推理。',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    defaultModel: 'gemini-3-flash-preview',
    description: '响应迅速，适合频繁对话。',
  },
] as const;

type ProviderOption = (typeof providerOptions)[number];

export type AiProviderPanelProps = {
  provider?: AiProvider;
  model?: string;
  onProviderChange?: (provider: AiProvider) => void;
  onModelChange?: (model: string) => void;
  isDisabled?: boolean;
};

function isAiProvider(value: string): value is AiProvider {
  return value === 'openai' || value === 'gemini';
}

function getProviderOption(provider: AiProvider): ProviderOption {
  return providerOptions.find((option) => option.id === provider) ?? providerOptions[0];
}

export default function AiProviderPanel({
  provider,
  model,
  onProviderChange,
  onModelChange,
  isDisabled = false,
}: AiProviderPanelProps) {
  const [internalProvider, setInternalProvider] = useState<AiProvider>(provider ?? 'openai');
  const [internalModel, setInternalModel] = useState(model ?? '');
  const activeProviderValue = provider ?? internalProvider;
  const activeModelValue = model ?? internalModel;

  const activeProvider = useMemo(() => getProviderOption(activeProviderValue), [activeProviderValue]);
  const effectiveModel = activeModelValue.trim() || activeProvider.defaultModel;

  function handleProviderChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    if (!isAiProvider(value)) {
      return;
    }
    if (!provider) {
      setInternalProvider(value);
    }
    onProviderChange?.(value);
  }

  function handleModelChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (!model) {
      setInternalModel(value);
    }
    onModelChange?.(value);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">模型配置</p>
          <h2 className="font-[var(--font-display)] text-xl text-[var(--ink-strong)]">AI 提供方</h2>
        </div>
        <span className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-soft)]">
          默认模型
        </span>
      </div>

      <div className="space-y-3">
        <label className="block text-xs text-[var(--ink-soft)]" htmlFor="ai-provider">
          Provider
        </label>
        <select
          className="w-full rounded-xl border border-[rgba(27,20,12,0.12)] bg-[rgba(255,255,255,0.75)] px-3 py-2 text-sm text-[var(--ink-strong)]"
          id="ai-provider"
          onChange={handleProviderChange}
          value={activeProviderValue}
          disabled={isDisabled}
        >
          {providerOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--ink-muted)]">{activeProvider.description}</p>
      </div>

      <div className="space-y-3">
        <label className="block text-xs text-[var(--ink-soft)]" htmlFor="ai-model">
          自定义模型（可选）
        </label>
        <input
          className="w-full rounded-xl border border-[rgba(27,20,12,0.12)] bg-[rgba(255,255,255,0.75)] px-3 py-2 text-sm text-[var(--ink-strong)]"
          id="ai-model"
          onChange={handleModelChange}
          placeholder={activeProvider.defaultModel}
          value={activeModelValue}
          disabled={isDisabled}
        />
        <p className="text-xs text-[var(--ink-muted)]">当前使用：{effectiveModel}</p>
      </div>
    </div>
  );
}
