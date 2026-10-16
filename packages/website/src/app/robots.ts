import type { MetadataRoute } from 'next';

// 允许抓取，这样爬虫才能读到页面上的 noindex；不提供 sitemap（issue #4）
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
  };
}
