import { afterEach, describe, expect, it } from 'vitest';
import { buildAssetUrl, buildGameHref, buildPlayGameUrl, buildWebsiteGameUrl, getRuntimeConfig } from './runtime';

afterEach(() => {
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_PLAY_BASE_URL');
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_ASSET_BASE_URL');
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_GAME_CREATION_MODE');
});

describe('runtime url helpers', () => {
  it('returns website game url when play domain is unset', () => {
    expect(buildPlayGameUrl('game-1')).toBe('/games/game-1');
    expect(buildGameHref('game-1')).toBe('/games/game-1');
    expect(buildWebsiteGameUrl('game-1')).toBe('/games/game-1');
  });

  it('returns play domain game url when configured', () => {
    process.env.NEXT_PUBLIC_PLAY_BASE_URL = 'https://play.muirpg.meathill.com';

    expect(buildPlayGameUrl('game-1')).toBe('https://play.muirpg.meathill.com/game-1');
    expect(buildGameHref('game-1')).toBe('https://play.muirpg.meathill.com/game-1');
  });

  it('returns asset url on asset domain when configured', () => {
    process.env.NEXT_PUBLIC_ASSET_BASE_URL = 'https://i.muirpg.meathill.com';

    expect(buildAssetUrl('images/cover.png')).toBe('https://i.muirpg.meathill.com/images/cover.png');
  });

  it('uses opencode game creation mode by default', () => {
    expect(getRuntimeConfig().gameCreationMode).toBe('opencode');
  });

  it('supports play-managed game creation mode', () => {
    process.env.NEXT_PUBLIC_GAME_CREATION_MODE = 'play';

    expect(getRuntimeConfig().gameCreationMode).toBe('play');
  });
});
