import type { Metadata } from 'next';
import { JetBrains_Mono, Noto_Sans_SC, Noto_Serif_SC, ZCOOL_XiaoWei } from 'next/font/google';
import './globals.css';

const bodyFont = Noto_Sans_SC({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  fallback: ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
});

const displayFont = Noto_Serif_SC({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
  fallback: ['Songti SC', 'STSong', 'Noto Serif CJK SC', 'serif'],
});

const accentFont = ZCOOL_XiaoWei({
  variable: '--font-accent',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  fallback: ['STKaiti', 'Kaiti SC', 'serif'],
});

const monoFont = JetBrains_Mono({
  variable: '--font-code',
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  fallback: ['Menlo', 'Consolas', 'monospace'],
});

export const metadata: Metadata = {
  title: '肉团长 · AI 跑团助手',
  description: '一个以剧情、人物卡与环境为核心的 AI 跑团体验原型。',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: ['/favicon.svg'],
  },
  openGraph: {
    title: '肉团长 · AI 跑团助手',
    description: '一个以剧情、人物卡与环境为核心的 AI 跑团体验原型。',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: '肉团长 · AI 跑团助手' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '肉团长 · AI 跑团助手',
    description: '一个以剧情、人物卡与环境为核心的 AI 跑团体验原型。',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${accentFont.variable} ${monoFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
