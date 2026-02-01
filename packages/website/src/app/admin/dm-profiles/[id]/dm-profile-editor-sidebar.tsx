'use client';

import { Button } from '@/components/ui/button';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 rounded-lg p-3';

const navItems = [
  { id: 'dm-section-basic', label: '基础信息' },
  { id: 'dm-section-guides', label: '全局指南' },
  { id: 'dm-section-rules', label: '规则清单' },
];

export default function DmProfileEditorSidebar() {
  return (
    <nav className={panelClassName}>
      <div>
        <p className={sectionTitleClassName}>编辑导航</p>
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">DM 风格</h3>
      </div>
      <div className="space-y-2">
        {navItems.map((item) => (
          <Button
            className="w-full justify-start"
            key={item.id}
            render={<a href={`#${item.id}`} />}
            size="sm"
            variant="outline"
          >
            {item.label}
          </Button>
        ))}
      </div>
    </nav>
  );
}
