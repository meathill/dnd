import { brandCatalog, getOrganizationJsonLd } from 'meathill-brand';
import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '肉团长',
  description: 'AI 跑团网站',
  publisher: 'Meathill Studio',
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    getOrganizationJsonLd(),
    {
      '@type': 'WebSite',
      name: 'MuiRPG · 肉团长',
      url: 'https://muirpg.meathill.com',
      publisher: { '@id': brandCatalog.organization.id },
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 结构化数据
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
