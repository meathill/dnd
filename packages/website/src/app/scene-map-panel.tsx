import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameMemoryMapRecord, ScriptDefinition } from '../lib/game/types';
import { useGameStore } from '../lib/game/game-store';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';

type SceneMapPanelProps = {
  script?: ScriptDefinition | null;
};

type MapResponse = {
  maps?: GameMemoryMapRecord[];
  error?: string;
};

function formatMapTime(value: string): string {
  if (!value) {
    return '未知时间';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export default function SceneMapPanel({ script }: SceneMapPanelProps) {
  const memory = useGameStore((state) => state.memory);
  const mapText = useGameStore((state) => state.mapText);
  const gameId = useGameStore((state) => state.activeGameId);
  const [mapVersions, setMapVersions] = useState<GameMemoryMapRecord[]>([]);
  const [selectedMapId, setSelectedMapId] = useState('latest');
  const locationLabel = memory?.presence.location || script?.setting || '未知区域';
  const sceneLabel = memory?.presence.scene ? ` · ${memory.presence.scene}` : '';
  const presence = memory?.presence.presentNpcs ?? [];
  const presenceLabel = presence.length > 0 ? presence.join('、') : '无';

  const loadMaps = useCallback(async () => {
    if (!gameId) {
      setMapVersions([]);
      return;
    }
    try {
      const response = await fetch(`/api/games/${gameId}/maps?limit=20`, { cache: 'no-store' });
      const data = (await response.json()) as MapResponse;
      if (!response.ok) {
        setMapVersions([]);
        return;
      }
      setMapVersions(Array.isArray(data.maps) ? data.maps : []);
    } catch {
      setMapVersions([]);
    }
  }, [gameId]);

  useEffect(() => {
    loadMaps();
  }, [loadMaps, mapText]);

  useEffect(() => {
    if (selectedMapId === 'latest') {
      return;
    }
    if (!mapVersions.some((entry) => entry.id === selectedMapId)) {
      setSelectedMapId('latest');
    }
  }, [mapVersions, selectedMapId]);

  const selectedMap = useMemo(() => {
    if (selectedMapId === 'latest') {
      return mapText ?? '';
    }
    const entry = mapVersions.find((item) => item.id === selectedMapId);
    return entry?.content ?? mapText ?? '';
  }, [mapText, mapVersions, selectedMapId]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink-soft)]">环境地图</p>
          <h2 className="font-[var(--font-display)] text-xl text-[var(--ink-strong)]">
            {locationLabel}
            {sceneLabel}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mapVersions.length > 0 ? (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="map-version-select">
                版本
              </Label>
              <Select value={selectedMapId} onValueChange={(value) => setSelectedMapId(value ?? 'latest')}>
                <SelectTrigger id="map-version-select" size="sm" aria-label="地图版本">
                  <SelectValue placeholder="最新地图" />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="latest">最新地图</SelectItem>
                  {mapVersions.map((entry) => (
                    <SelectItem key={entry.id} value={entry.id}>
                      {`回合 ${entry.roundIndex} · ${formatMapTime(entry.createdAt)}`}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          ) : null}
          <span className="rounded-lg border border-[rgba(27,20,12,0.12)] px-2 py-1 text-[11px] text-[var(--ink-soft)]">
            在场 NPC：{presenceLabel}
          </span>
        </div>
      </div>
      <div className="animate-[fade-up_1s_ease-out_both] flex flex-col gap-3" style={{ animationDelay: '0.18s' }}>
        <div className="map-surface flex h-54 rounded-lg border border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.65)] p-4">
          {selectedMap ? (
            <pre className="w-full whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--ink-strong)]">
              {selectedMap}
            </pre>
          ) : (
            <div className="flex w-full items-center justify-center text-sm text-[var(--ink-soft)]">
              等待 DM 更新地图...
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--ink-soft)]">提示：地图使用 ASCII/emoji 展示位置关系与周边环境。</p>
      </div>
    </div>
  );
}
