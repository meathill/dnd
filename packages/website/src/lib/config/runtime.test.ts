import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAssetUrl, buildGameHref, getRuntimeConfig } from './runtime';

afterEach(() => {
  vi.unstubAllEnvs();
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ASSET_BASE_URL');
  Reflect.deleteProperty(process.env, 'GAME_RUNTIME');
  Reflect.deleteProperty(process.env, 'GAME_LLM_MODEL');
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL');
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS');
});

describe('runtime url helpers', () => {
  it('returns local game href', () => {
    expect(buildGameHref('game-1')).toBe('/games/game-1');
  });

  it('returns asset url on asset domain when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_ASSET_BASE_URL', 'https://i.muirpg.meathill.com');

    expect(buildAssetUrl('images/cover.png')).toBe('https://i.muirpg.meathill.com/images/cover.png');
  });

  it('uses stub game runtime by default', () => {
    const runtime = getRuntimeConfig();

    expect(runtime.gameRuntimeMode).toBe('stub');
    expect(runtime.gameLlmModel).toBe('gpt-4.1-mini');
    expect(runtime.llmUpstreamBaseUrl).toBeNull();
    expect(runtime.llmAllowedModels).toEqual([]);
  });

  it('supports opencode game runtime configuration', () => {
    vi.stubEnv('GAME_RUNTIME', 'opencode');
    vi.stubEnv('GAME_LLM_MODEL', 'mimo-v2.5-pro');
    vi.stubEnv('NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS', 'mimo-v2.5-pro gpt-4o-mini');

    expect(getRuntimeConfig()).toMatchObject({
      gameRuntimeMode: 'opencode',
      gameLlmModel: 'mimo-v2.5-pro',
      llmUpstreamBaseUrl: 'https://api.example.com',
      llmAllowedModels: ['mimo-v2.5-pro', 'gpt-4o-mini'],
    });
  });
});
