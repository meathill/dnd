'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GlobalConfigPane = 'dm-profiles' | 'ai-models';

const NAV_ITEMS: Array<{ id: GlobalConfigPane; label: string; href: string; description: string }> = [
  {
    id: 'dm-profiles',
    label: 'DM 风格',
    href: '/admin/dm-profiles',
    description: '管理叙事风格、判定指引与规则集。',
  },
  {
    id: 'ai-models',
    label: 'AI 模型管理',
    href: '/admin/ai-models',
    description: '配置可选的 AI 模型（Provider、模型名、可选自定义接口）。',
  },
];

type GlobalConfigShellProps = {
  active: GlobalConfigPane;
  children: ReactNode;
};

export default function GlobalConfigShell({ active, children }: GlobalConfigShellProps) {
  const activeItem = NAV_ITEMS.find((item) => item.id === active) ?? NAV_ITEMS[0];
  return (
    <div className="grid gap-4 p-3 sm:p-4 lg:grid-cols-[14rem_minmax(0,1fr)] lg:h-full lg:overflow-hidden">
      <aside className="panel-card flex flex-col gap-2 p-3 sm:p-4 lg:overflow-auto">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]">全局配置</p>
        <h2 className="text-base font-semibold text-[var(--ink-strong)]">{activeItem.label}</h2>
        <p className="text-xs text-[var(--ink-muted)]">{activeItem.description}</p>
        <nav className="mt-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Button
              className={cn('w-full justify-start')}
              key={item.id}
              render={<Link href={item.href} />}
              size="sm"
              variant={item.id === active ? 'default' : 'outline'}
            >
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>
      <div className="lg:overflow-hidden">{children}</div>
    </div>
  );
}
