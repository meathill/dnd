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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml"></link>
      </head>
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${accentFont.variable} ${monoFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
