import { afterEach, describe, expect, it } from 'vitest';
import { buildWebsiteApiUrl, getPlayRuntimeConfig } from './runtime';

afterEach(() => {
  Reflect.deleteProperty(process.env, 'PLAY_BASE_URL');
  Reflect.deleteProperty(process.env, 'WEBSITE_BASE_URL');
  Reflect.deleteProperty(process.env, 'PLAY_RUNTIME');
  Reflect.deleteProperty(process.env, 'PLAY_LLM_MODEL');
  Reflect.deleteProperty(process.env, 'INTERNAL_SERVICE_TOKEN');
});

describe('play runtime config', () => {
  it('uses defaults when env is absent', () => {
    const config = getPlayRuntimeConfig();

    expect(config.playBaseUrl).toBe('http://127.0.0.1:3091');
    expect(config.websiteBaseUrl).toBe('http://127.0.0.1:3090');
    expect(config.llmModel).toBe('gpt-4.1-mini');
    expect(config.runtimeMode).toBe('stub');
  });

  it('builds website api url from configured origin', () => {
    process.env.WEBSITE_BASE_URL = 'https://muirpg.meathill.com';

    expect(buildWebsiteApiUrl('/api/games/game-1')).toBe('https://muirpg.meathill.com/api/games/game-1');
  });

  it('uses configured play llm model', () => {
    process.env.PLAY_LLM_MODEL = 'gpt-4o-mini';

    expect(getPlayRuntimeConfig().llmModel).toBe('gpt-4o-mini');
  });
});
