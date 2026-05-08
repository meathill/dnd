export type GameRuntimeMode = 'stub' | 'opencode';

const DEFAULT_APP_BASE_URL = 'http://127.0.0.1:3090';
const DEFAULT_GAME_LLM_MODEL = 'gpt-4.1-mini';

export type RuntimeConfig = {
  appBaseUrl: string;
  assetBaseUrl: string | null;
  authCookieDomain: string | null;
  trustedOrigins: string[];
  gameRuntimeMode: GameRuntimeMode;
  gameLlmModel: string;
  llmUpstreamBaseUrl: string | null;
  llmAllowedModels: string[];
};

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeOrigin(value: string): string {
  return new URL(value).origin;
}

function normalizeUrl(value: string): string {
  return trimTrailingSlash(new URL(value).toString());
}

function resolveOptionalUrl(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }
  return normalizeUrl(normalized);
}

function resolveAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }
  const legacyAuthUrl = process.env.BETTER_AUTH_URL?.trim();
  if (legacyAuthUrl) {
    return normalizeOrigin(legacyAuthUrl);
  }
  return DEFAULT_APP_BASE_URL;
}

function collectTrustedOrigins(origins: ReadonlyArray<string | null>): string[] {
  return [...new Set(origins.filter((value): value is string => Boolean(value)))];
}

function parseAllowedModels(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveGameRuntimeMode(): GameRuntimeMode {
  return process.env.GAME_RUNTIME?.trim() === 'opencode' ? 'opencode' : 'stub';
}

export function getRuntimeConfig(): RuntimeConfig {
  const appBaseUrl = resolveAppBaseUrl();
  const assetBaseUrl = resolveOptionalUrl(process.env.NEXT_PUBLIC_ASSET_BASE_URL);
  return {
    appBaseUrl,
    assetBaseUrl,
    authCookieDomain: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim() || null,
    trustedOrigins: collectTrustedOrigins([normalizeOrigin(appBaseUrl)]),
    gameRuntimeMode: resolveGameRuntimeMode(),
    gameLlmModel: process.env.GAME_LLM_MODEL?.trim() || DEFAULT_GAME_LLM_MODEL,
    llmUpstreamBaseUrl: resolveOptionalUrl(process.env.NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL),
    llmAllowedModels: parseAllowedModels(process.env.NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS),
  };
}

export function buildGameHref(gameId: string): string {
  return `/games/${gameId}`;
}

export function buildAssetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  const { assetBaseUrl } = getRuntimeConfig();
  if (!assetBaseUrl) {
    return `/${normalizedPath}`;
  }
  return new URL(`/${normalizedPath}`, `${assetBaseUrl}/`).toString();
}
