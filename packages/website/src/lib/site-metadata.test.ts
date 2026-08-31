import { describe, expect, it } from 'vitest';
import { MUIRPG_METADATA, MUIRPG_SITE_URL } from './site-metadata';

describe('MuiRPG SEO metadata', () => {
  it('使用独立产品域名作为绝对 canonical', () => {
    expect(MUIRPG_METADATA.metadataBase?.toString()).toBe(`${MUIRPG_SITE_URL}/`);
    expect(MUIRPG_METADATA.alternates?.canonical).toBe(MUIRPG_SITE_URL);
  });
});
