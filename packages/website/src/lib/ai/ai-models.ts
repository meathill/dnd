import type { AiProvider } from './ai-types';

export type AiModelKind = 'fast' | 'general';

export const AI_MODEL_CATALOG = {
  openai: {
    fast: ['gpt-5-mini'],
    general: ['gpt-5.2', 'gpt-5-mini'],
  },
  gemini: {
    fast: ['gemini-3-flash-preview'],
    general: ['gemini-3-pro-preview', 'gemini-3-flash-preview'],
  },
} as const satisfies Record<AiProvider, Record<AiModelKind, readonly string[]>>;

export function listModels(provider: AiProvider, kind: AiModelKind): string[] {
  return [...AI_MODEL_CATALOG[provider][kind]];
}

export function getDefaultModel(provider: AiProvider, kind: AiModelKind): string {
  return AI_MODEL_CATALOG[provider][kind][0] ?? '';
}

export function normalizeModel(provider: AiProvider, kind: AiModelKind, value?: string): string {
  const options = AI_MODEL_CATALOG[provider][kind];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed && options.includes(trimmed)) {
      return trimmed;
    }
  }
  return options[0] ?? '';
}

export function isAllowedModel(provider: AiProvider, kind: AiModelKind, value: string): boolean {
  return AI_MODEL_CATALOG[provider][kind].includes(value);
}
