'use client';

import { Button } from '@/components/ui/button';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';
const panelClassName = 'panel-card flex flex-col gap-3 rounded-lg p-3';

const navItems = [
  { id: 'script-section-basic', label: '基础信息' },
  { id: 'script-section-opening', label: '开场对白' },
  { id: 'script-section-background', label: '背景设定' },
  { id: 'script-section-arcs', label: '剧情走向' },
  { id: 'script-section-scenes', label: '场景清单' },
  { id: 'script-section-encounters', label: '遭遇清单' },
  { id: 'script-section-npcs', label: 'NPC 档案' },
  { id: 'script-section-occupations', label: '职业预设' },
  { id: 'script-section-options', label: '建卡选项' },
  { id: 'script-section-limits', label: '属性与限制' },
  { id: 'script-section-rules', label: '规则覆盖' },
];

export default function ScriptEditorSidebar() {
  return (
    <nav className={panelClassName}>
      <div>
        <p className={sectionTitleClassName}>编辑导航</p>
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">剧本结构</h3>
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
