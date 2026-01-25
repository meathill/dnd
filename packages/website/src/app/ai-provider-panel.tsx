'use client';

import { useMemo, useState } from 'react';
import type { AiProvider } from '../lib/ai/ai-types';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

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

  function handleProviderChange(value: string) {
    if (!isAiProvider(value)) {
      return;
    }
    if (!provider) {
      setInternalProvider(value);
    }
    onProviderChange?.(value);
  }

  function handleModelChange(value: string) {
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
        <Badge className="px-3 py-1 text-xs text-[var(--ink-soft)]" variant="outline">
          默认模型
        </Badge>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-[var(--ink-soft)]" htmlFor="ai-provider">
          Provider
        </Label>
        <Select value={activeProviderValue} onValueChange={handleProviderChange} disabled={isDisabled}>
          <SelectTrigger aria-label="Provider" className="bg-[rgba(255,255,255,0.75)]" id="ai-provider" size="sm">
            <SelectValue placeholder="选择提供方" />
          </SelectTrigger>
          <SelectContent>
            {providerOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--ink-muted)]">{activeProvider.description}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-[var(--ink-soft)]" htmlFor="ai-model">
          自定义模型（可选）
        </Label>
        <Input
          className="bg-[rgba(255,255,255,0.75)] text-[var(--ink-strong)]"
          id="ai-model"
          onChange={(event) => handleModelChange(event.target.value)}
          placeholder={activeProvider.defaultModel}
          value={activeModelValue}
          disabled={isDisabled}
          size="sm"
        />
        <p className="text-xs text-[var(--ink-muted)]">当前使用：{effectiveModel}</p>
      </div>
    </div>
  );
}
