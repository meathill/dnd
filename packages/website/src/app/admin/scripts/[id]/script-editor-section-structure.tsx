'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { createEncounterDraft, createSceneDraft, createStoryArcDraft } from './script-editor-mappers';

type ScriptStructureSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptStructureSection({ draft, mutateDraft }: ScriptStructureSectionProps) {
  function handleStoryArcChange(index: number, field: keyof ScriptDraft['storyArcs'][number], value: string) {
    mutateDraft((next) => {
      next.storyArcs[index][field] = value;
    });
  }

  function handleAddStoryArc() {
    mutateDraft((next) => {
      next.storyArcs.push(createStoryArcDraft());
    });
  }

  function handleRemoveStoryArc(index: number) {
    mutateDraft((next) => {
      next.storyArcs.splice(index, 1);
    });
  }

  function handleSceneChange(index: number, field: keyof ScriptDraft['scenes'][number], value: string) {
    mutateDraft((next) => {
      next.scenes[index][field] = value;
    });
  }

  function handleAddScene() {
    mutateDraft((next) => {
      next.scenes.push(createSceneDraft());
    });
  }

  function handleRemoveScene(index: number) {
    mutateDraft((next) => {
      next.scenes.splice(index, 1);
    });
  }

  function handleEncounterChange(index: number, field: keyof ScriptDraft['encounters'][number], value: string) {
    mutateDraft((next) => {
      next.encounters[index][field] = value;
    });
  }

  function handleAddEncounter() {
    mutateDraft((next) => {
      next.encounters.push(createEncounterDraft());
    });
  }

  function handleRemoveEncounter(index: number) {
    mutateDraft((next) => {
      next.encounters.splice(index, 1);
    });
  }

  return (
    <>
      <Section id="script-section-arcs" title="剧情走向" description="每条剧情线包含主线节拍与关键揭示。">
        {draft.storyArcs.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">暂无剧情走向。</p>
        ) : (
          <div className="space-y-3">
            {draft.storyArcs.map((arc, index) => (
              <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs" key={arc.id}>
                <div className="grid gap-3 lg:grid-cols-[1fr_6rem]">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">编号</Label>
                      <Input
                        size="sm"
                        value={arc.id}
                        onChange={(event) => handleStoryArcChange(index, 'id', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">标题</Label>
                      <Input
                        size="sm"
                        value={arc.title}
                        onChange={(event) => handleStoryArcChange(index, 'title', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-[10px] text-[var(--ink-soft)]">简介</Label>
                      <Textarea
                        rows={2}
                        value={arc.summary}
                        onChange={(event) => handleStoryArcChange(index, 'summary', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">节拍（每行一条）</Label>
                      <Textarea
                        rows={3}
                        value={arc.beatsText}
                        onChange={(event) => handleStoryArcChange(index, 'beatsText', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">揭示（每行一条）</Label>
                      <Textarea
                        rows={3}
                        value={arc.revealsText}
                        onChange={(event) => handleStoryArcChange(index, 'revealsText', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-start justify-end">
                    <Button onClick={() => handleRemoveStoryArc(index)} size="xs" variant="destructive-outline">
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleAddStoryArc} size="sm" variant="outline">
          添加剧情线
        </Button>
      </Section>

      <Section id="script-section-scenes" title="场景清单" description="列出主要场景和钩子。">
        {draft.scenes.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">暂无场景。</p>
        ) : (
          <div className="space-y-3">
            {draft.scenes.map((scene, index) => (
              <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs" key={scene.id}>
                <div className="grid gap-3 lg:grid-cols-[1fr_6rem]">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">编号</Label>
                      <Input
                        size="sm"
                        value={scene.id}
                        onChange={(event) => handleSceneChange(index, 'id', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">标题</Label>
                      <Input
                        size="sm"
                        value={scene.title}
                        onChange={(event) => handleSceneChange(index, 'title', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-[10px] text-[var(--ink-soft)]">简介</Label>
                      <Textarea
                        rows={2}
                        value={scene.summary}
                        onChange={(event) => handleSceneChange(index, 'summary', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">地点</Label>
                      <Input
                        size="sm"
                        value={scene.location}
                        onChange={(event) => handleSceneChange(index, 'location', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">钩子（每行一条）</Label>
                      <Textarea
                        rows={3}
                        value={scene.hooksText}
                        onChange={(event) => handleSceneChange(index, 'hooksText', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-start justify-end">
                    <Button onClick={() => handleRemoveScene(index)} size="xs" variant="destructive-outline">
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleAddScene} size="sm" variant="outline">
          添加场景
        </Button>
      </Section>

      <Section id="script-section-encounters" title="遭遇清单" description="战斗或危机事件的摘要。">
        {draft.encounters.length === 0 ? (
          <p className="text-xs text-[var(--ink-muted)]">暂无遭遇。</p>
        ) : (
          <div className="space-y-3">
            {draft.encounters.map((encounter, index) => (
              <div
                className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs"
                key={encounter.id}
              >
                <div className="grid gap-3 lg:grid-cols-[1fr_6rem]">
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">编号</Label>
                      <Input
                        size="sm"
                        value={encounter.id}
                        onChange={(event) => handleEncounterChange(index, 'id', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">标题</Label>
                      <Input
                        size="sm"
                        value={encounter.title}
                        onChange={(event) => handleEncounterChange(index, 'title', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1 lg:col-span-2">
                      <Label className="text-[10px] text-[var(--ink-soft)]">简介</Label>
                      <Textarea
                        rows={2}
                        value={encounter.summary}
                        onChange={(event) => handleEncounterChange(index, 'summary', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">关联 NPC（每行一条）</Label>
                      <Textarea
                        rows={3}
                        value={encounter.npcsText}
                        onChange={(event) => handleEncounterChange(index, 'npcsText', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">危险等级</Label>
                      <Input
                        size="sm"
                        value={encounter.danger}
                        onChange={(event) => handleEncounterChange(index, 'danger', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-start justify-end">
                    <Button onClick={() => handleRemoveEncounter(index)} size="xs" variant="destructive-outline">
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button onClick={handleAddEncounter} size="sm" variant="outline">
          添加遭遇
        </Button>
      </Section>
    </>
  );
}
