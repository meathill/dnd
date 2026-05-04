import { afterEach, describe, expect, it } from 'vitest';
import { buildAssetUrl, buildGameHref, buildPlayGameUrl, buildWebsiteGameUrl } from './runtime';

afterEach(() => {
  delete process.env.PLAY_BASE_URL;
  delete process.env.ASSET_BASE_URL;
});

describe('runtime url helpers', () => {
  it('returns website game url when play domain is unset', () => {
    expect(buildPlayGameUrl('game-1')).toBe('/games/game-1');
    expect(buildGameHref('game-1')).toBe('/games/game-1');
    expect(buildWebsiteGameUrl('game-1')).toBe('/games/game-1');
  });

  it('returns play domain game url when configured', () => {
    process.env.PLAY_BASE_URL = 'https://play.muirpg.com';

    expect(buildPlayGameUrl('game-1')).toBe('https://play.muirpg.com/game-1');
    expect(buildGameHref('game-1')).toBe('https://play.muirpg.com/game-1');
  });

  it('returns asset url on asset domain when configured', () => {
    process.env.ASSET_BASE_URL = 'https://i.muirpg.com';

    expect(buildAssetUrl('images/cover.png')).toBe('https://i.muirpg.com/images/cover.png');
  });
});
