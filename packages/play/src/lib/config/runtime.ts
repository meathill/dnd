export type PlayRuntimeMode = 'stub' | 'website' | 'opencode';

export type PlayRuntimeConfig = {
  playBaseUrl: string;
  websiteBaseUrl: string;
  internalServiceToken: string | null;
  llmModel: string;
  runtimeMode: PlayRuntimeMode;
};

function normalizeOrigin(value: string): string {
  return new URL(value).origin;
}

export function getPlayRuntimeConfig(): PlayRuntimeConfig {
  const runtimeMode = (process.env.NEXT_PUBLIC_PLAY_RUNTIME?.trim() || 'stub') as PlayRuntimeMode;
  return {
    playBaseUrl: normalizeOrigin(process.env.NEXT_PUBLIC_PLAY_BASE_URL?.trim() || 'http://127.0.0.1:3091'),
    websiteBaseUrl: normalizeOrigin(process.env.NEXT_PUBLIC_WEBSITE_BASE_URL?.trim() || 'http://127.0.0.1:3090'),
    internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN?.trim() || null,
    llmModel: process.env.NEXT_PUBLIC_PLAY_LLM_MODEL?.trim() || 'gpt-4.1-mini',
    runtimeMode,
  };
}

export function buildWebsiteApiUrl(path: string): string {
  const { websiteBaseUrl } = getPlayRuntimeConfig();
  return new URL(path, `${websiteBaseUrl}/`).toString();
}
