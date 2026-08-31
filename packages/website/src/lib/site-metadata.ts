import type { Metadata } from 'next';

export const MUIRPG_SITE_URL = 'https://muirpg.meathill.com';

export const MUIRPG_METADATA: Metadata = {
  metadataBase: new URL(MUIRPG_SITE_URL),
  title: '肉团长',
  description: 'AI 跑团网站',
  publisher: 'Meathill Studio',
  alternates: {
    canonical: MUIRPG_SITE_URL,
  },
};
