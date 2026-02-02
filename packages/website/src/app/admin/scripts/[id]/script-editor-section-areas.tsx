'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { createExplorableAreaDraft } from './script-editor-mappers';

type ScriptAreaSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptAreaSection({ draft, mutateDraft }: ScriptAreaSectionProps) {
  function handleAreaChange(index: number, field: keyof ScriptDraft['explorableAreas'][number], value: string) {
    mutateDraft((next) => {
      next.explorableAreas[index][field] = value;
    });
  }

  function handleAddArea() {
    mutateDraft((next) => {
      next.explorableAreas.push(createExplorableAreaDraft());
    });
  }

  function handleRemoveArea(index: number) {
    mutateDraft((next) => {
      next.explorableAreas.splice(index, 1);
    });
  }

  return (
    <Section
      id="script-section-areas"
      title="全局地图"
      description="玩家在地图上可直接看到的可探索区域（摘要与预设描述会显示在地图上）。"
    >
      {draft.explorableAreas.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">暂无可探索区域。</p>
      ) : (
        <div className="space-y-3">
          {draft.explorableAreas.map((area, index) => (
            <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs" key={area.id}>
              <div className="grid gap-3 lg:grid-cols-[1fr_6rem]">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">编号</Label>
                    <Input
                      size="sm"
                      value={area.id}
                      onChange={(event) => handleAreaChange(index, 'id', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">区域名称</Label>
                    <Input
                      size="sm"
                      value={area.name}
                      onChange={(event) => handleAreaChange(index, 'name', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">摘要（玩家可见）</Label>
                    <Textarea
                      rows={2}
                      value={area.summary}
                      onChange={(event) => handleAreaChange(index, 'summary', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">预设描述（玩家可见）</Label>
                    <Textarea
                      rows={3}
                      value={area.description}
                      onChange={(event) => handleAreaChange(index, 'description', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">DM 备注（仅 DM）</Label>
                    <Textarea
                      rows={2}
                      value={area.dmNotes}
                      onChange={(event) => handleAreaChange(index, 'dmNotes', event.target.value)}
                      placeholder="提示或隐藏信息，不展示给玩家"
                    />
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <Button onClick={() => handleRemoveArea(index)} size="xs" variant="destructive-outline">
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleAddArea} size="sm" variant="outline">
        添加区域
      </Button>
    </Section>
  );
}
