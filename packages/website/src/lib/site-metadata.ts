import type { Metadata } from 'next';

export const MUIRPG_SITE_URL = 'https://muirpg.meathill.com';

export const MUIRPG_METADATA: Metadata = {
  metadataBase: new URL(MUIRPG_SITE_URL),
  title: '肉团长',
  description: 'AI 跑团网站',
  publisher: 'Meathill Studio',
  // 整个子域名不进入搜索引擎索引（issue #4）
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: {
    canonical: MUIRPG_SITE_URL,
  },
};
