const DEFAULT_APP_BASE_URL = 'http://127.0.0.1:3090';

export type RuntimeConfig = {
  appBaseUrl: string;
  playBaseUrl: string | null;
  assetBaseUrl: string | null;
  llmProxyUrl: string;
  authCookieDomain: string | null;
  trustedOrigins: string[];
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
  const configured = process.env.APP_BASE_URL?.trim();
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

export function getRuntimeConfig(): RuntimeConfig {
  const appBaseUrl = resolveAppBaseUrl();
  const playBaseUrl = resolveOptionalUrl(process.env.PLAY_BASE_URL);
  const assetBaseUrl = resolveOptionalUrl(process.env.ASSET_BASE_URL);
  return {
    appBaseUrl,
    playBaseUrl,
    assetBaseUrl,
    llmProxyUrl: new URL('/api/llmproxy', `${appBaseUrl}/`).toString(),
    authCookieDomain: process.env.AUTH_COOKIE_DOMAIN?.trim() || null,
    trustedOrigins: collectTrustedOrigins([
      normalizeOrigin(appBaseUrl),
      playBaseUrl ? normalizeOrigin(playBaseUrl) : null,
    ]),
  };
}

export function buildPlayGameUrl(gameId: string): string {
  const { playBaseUrl } = getRuntimeConfig();
  if (!playBaseUrl) {
    return `/games/${gameId}`;
  }
  return new URL(`/${gameId}`, `${playBaseUrl}/`).toString();
}

export function buildWebsiteGameUrl(gameId: string): string {
  return `/games/${gameId}`;
}

export function buildGameHref(gameId: string): string {
  return buildPlayGameUrl(gameId);
}

export function buildAssetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  const { assetBaseUrl } = getRuntimeConfig();
  if (!assetBaseUrl) {
    return `/${normalizedPath}`;
  }
  return new URL(`/${normalizedPath}`, `${assetBaseUrl}/`).toString();
}
