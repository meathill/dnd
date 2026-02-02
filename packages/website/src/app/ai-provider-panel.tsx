'use client';

import { useMemo, useState } from 'react';
import type { AiProvider } from '../lib/ai/ai-types';
import { getDefaultModel, isAllowedModel, listModels, normalizeModel } from '../lib/ai/ai-models';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const providerOptions = [
  {
    id: 'openai',
    label: 'OpenAI',
    description: '稳定通用，适合叙事与规则推理。',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: '响应迅速，适合频繁对话。',
  },
] as const;

type ProviderOption = (typeof providerOptions)[number];

export type AiProviderPanelProps = {
  provider?: AiProvider;
  fastModel?: string;
  generalModel?: string;
  onProviderChange?: (provider: AiProvider) => void;
  onFastModelChange?: (model: string) => void;
  onGeneralModelChange?: (model: string) => void;
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
  fastModel,
  generalModel,
  onProviderChange,
  onFastModelChange,
  onGeneralModelChange,
  isDisabled = false,
}: AiProviderPanelProps) {
  const [internalProvider, setInternalProvider] = useState<AiProvider>(provider ?? 'openai');
  const [internalFastModel, setInternalFastModel] = useState(fastModel ?? '');
  const [internalGeneralModel, setInternalGeneralModel] = useState(generalModel ?? '');
  const activeProviderValue = provider ?? internalProvider;
  const activeFastModelValue = fastModel ?? internalFastModel;
  const activeGeneralModelValue = generalModel ?? internalGeneralModel;

  const activeProvider = useMemo(() => getProviderOption(activeProviderValue), [activeProviderValue]);
  const fastOptions = useMemo(() => listModels(activeProviderValue, 'fast'), [activeProviderValue]);
  const generalOptions = useMemo(() => listModels(activeProviderValue, 'general'), [activeProviderValue]);
  const resolvedFastModel = normalizeModel(activeProviderValue, 'fast', activeFastModelValue);
  const resolvedGeneralModel = normalizeModel(activeProviderValue, 'general', activeGeneralModelValue);

  function handleProviderChange(value: string | null) {
    if (!value || !isAiProvider(value)) {
      return;
    }
    if (!provider) {
      setInternalProvider(value);
    }
    onProviderChange?.(value);
    const nextFastModel = getDefaultModel(value, 'fast');
    const nextGeneralModel = getDefaultModel(value, 'general');
    if (!isAllowedModel(value, 'fast', activeFastModelValue)) {
      if (!fastModel) {
        setInternalFastModel(nextFastModel);
      }
      onFastModelChange?.(nextFastModel);
    }
    if (!isAllowedModel(value, 'general', activeGeneralModelValue)) {
      if (!generalModel) {
        setInternalGeneralModel(nextGeneralModel);
      }
      onGeneralModelChange?.(nextGeneralModel);
    }
  }

  function handleFastModelChange(value: string | null) {
    if (!value) {
      return;
    }
    if (!fastModel) {
      setInternalFastModel(value);
    }
    onFastModelChange?.(value);
  }

  function handleGeneralModelChange(value: string | null) {
    if (!value) {
      return;
    }
    if (!generalModel) {
      setInternalGeneralModel(value);
    }
    onGeneralModelChange?.(value);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">模型配置</p>
          <h2 className="font-[var(--font-display)] text-xl text-[var(--ink-strong)]">AI 提供方</h2>
        </div>
        <Badge className="px-3 py-1 text-xs text-[var(--ink-soft)]" variant="outline">
          受限列表
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
        <Label className="text-xs text-[var(--ink-soft)]" htmlFor="ai-fast-model">
          快速审查模型
        </Label>
        <Select value={resolvedFastModel} onValueChange={handleFastModelChange} disabled={isDisabled}>
          <SelectTrigger aria-label="快速审查模型" className="bg-[rgba(255,255,255,0.75)]" id="ai-fast-model" size="sm">
            <SelectValue placeholder={getDefaultModel(activeProviderValue, 'fast')} />
          </SelectTrigger>
          <SelectContent>
            {fastOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--ink-muted)]">用于指令合法性判定与结构化拆分。</p>
        <p className="text-xs text-[var(--ink-muted)]">当前使用：{resolvedFastModel}</p>
      </div>

      <div className="space-y-3">
        <Label className="text-xs text-[var(--ink-soft)]" htmlFor="ai-general-model">
          通用智能模型
        </Label>
        <Select value={resolvedGeneralModel} onValueChange={handleGeneralModelChange} disabled={isDisabled}>
          <SelectTrigger
            aria-label="通用智能模型"
            className="bg-[rgba(255,255,255,0.75)]"
            id="ai-general-model"
            size="sm"
          >
            <SelectValue placeholder={getDefaultModel(activeProviderValue, 'general')} />
          </SelectTrigger>
          <SelectContent>
            {generalOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-[var(--ink-muted)]">用于生成完整冒险叙事与 DM 描述。</p>
        <p className="text-xs text-[var(--ink-muted)]">当前使用：{resolvedGeneralModel}</p>
      </div>
    </div>
  );
}
