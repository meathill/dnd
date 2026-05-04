import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '肉团长 Play',
  description: '肉团长独立游戏运行时',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
