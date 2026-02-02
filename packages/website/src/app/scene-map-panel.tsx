import { useMemo, useState } from 'react';
import type { ScriptDefinition, ScriptExplorableArea } from '../lib/game/types';
import { useGameStore } from '../lib/game/game-store';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from '../components/ui/popover';

type SceneMapPanelProps = {
  script?: ScriptDefinition | null;
};

type AreaStatus = {
  label: string;
  variant: 'outline' | 'secondary' | 'success' | 'warning';
};

function resolveAreaStatus(area: ScriptExplorableArea, statusMap: Map<string, string>): AreaStatus {
  const rawStatus = statusMap.get(area.name) ?? statusMap.get(area.id) ?? '';
  const status = rawStatus.trim();
  if (!status) {
    return { label: statusMap.has(area.name) || statusMap.has(area.id) ? '已探索' : '未探索', variant: 'outline' };
  }
  if (status.includes('未探索')) {
    return { label: status, variant: 'outline' };
  }
  if (status.includes('封锁') || status.includes('危险') || status.includes('受损')) {
    return { label: status, variant: 'warning' };
  }
  if (status.includes('已探索') || status.includes('安全')) {
    return { label: status, variant: 'success' };
  }
  return { label: status, variant: 'secondary' };
}

export default function SceneMapPanel({ script }: SceneMapPanelProps) {
  const memory = useGameStore((state) => state.memory);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);
  const areas = script?.background.explorableAreas ?? [];
  const statusMap = useMemo(() => {
    const map = new Map<string, string>();
    (memory?.locations ?? []).forEach((location) => {
      map.set(location.name, location.status ?? '');
    });
    return map;
  }, [memory?.locations]);
  const mapTitle = script?.title ?? '未载入剧本';
  const mapSubtitle = script?.setting ?? '未知背景';

  function handleAreaEnter(areaId: string) {
    setActiveAreaId(areaId);
  }

  function handleAreaLeave(areaId: string) {
    setActiveAreaId((current) => (current === areaId ? null : current));
  }

  function handleAreaToggle(areaId: string) {
    setActiveAreaId((current) => (current === areaId ? null : areaId));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">全局地图</p>
          <h2 className="font-[var(--font-display)] text-xl text-[var(--ink-strong)]">{mapTitle}</h2>
          <p className="text-xs text-[var(--ink-soft)]">{mapSubtitle}</p>
        </div>
        <Badge variant="outline" size="sm">
          区域数：{areas.length}
        </Badge>
      </div>
      <div className="animate-[fade-up_1s_ease-out_both] flex flex-col gap-3" style={{ animationDelay: '0.18s' }}>
        {areas.length === 0 ? (
          <div className="flex h-40 items-center justify-center rounded-lg border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.65)] text-sm text-[var(--ink-soft)]">
            暂无可探索区域
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {areas.map((area) => {
              const status = resolveAreaStatus(area, statusMap);
              const isOpen = activeAreaId === area.id;
              const description = area.description?.trim() || '暂无预设描述。';
              const summary = area.summary?.trim() || '暂无摘要。';
              return (
                <Popover key={area.id} open={isOpen} onOpenChange={(open) => setActiveAreaId(open ? area.id : null)}>
                  <PopoverTrigger
                    render={
                      <Button
                        className="h-auto w-full items-start justify-between gap-3 p-3 text-left"
                        onClick={() => handleAreaToggle(area.id)}
                        onMouseEnter={() => handleAreaEnter(area.id)}
                        onMouseLeave={() => handleAreaLeave(area.id)}
                        size="sm"
                        variant="outline"
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-[var(--ink-strong)]">{area.name}</p>
                          <p className="text-xs text-[var(--ink-soft)]">{summary}</p>
                        </div>
                        <Badge variant={status.variant} size="sm">
                          {status.label}
                        </Badge>
                      </Button>
                    }
                  />
                  <PopoverPopup
                    align="start"
                    className="w-64"
                    onMouseEnter={() => handleAreaEnter(area.id)}
                    onMouseLeave={() => handleAreaLeave(area.id)}
                  >
                    <div className="space-y-2 text-xs">
                      <PopoverTitle className="text-sm">{area.name}</PopoverTitle>
                      <div>
                        <p className="text-[11px] text-[var(--ink-soft)]">摘要</p>
                        <p className="text-[var(--ink-strong)]">{summary}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-[var(--ink-soft)]">预设描述</p>
                        <p className="text-[var(--ink-strong)]">{description}</p>
                      </div>
                    </div>
                  </PopoverPopup>
                </Popover>
              );
            })}
          </div>
        )}
        <p className="text-xs text-[var(--ink-soft)]">提示：悬停或点击区域可查看摘要与预设描述。</p>
      </div>
    </div>
  );
}
