'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { createEnemyProfileDraft } from './script-editor-mappers';

type ScriptEnemySectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

export default function ScriptEnemySection({ draft, mutateDraft }: ScriptEnemySectionProps) {
  function handleEnemyChange(index: number, field: keyof ScriptDraft['enemyProfiles'][number], value: string) {
    mutateDraft((next) => {
      next.enemyProfiles[index][field] = value;
    });
  }

  function handleAddEnemy() {
    mutateDraft((next) => {
      next.enemyProfiles.push(createEnemyProfileDraft());
    });
  }

  function handleRemoveEnemy(index: number) {
    mutateDraft((next) => {
      next.enemyProfiles.splice(index, 1);
    });
  }

  return (
    <Section title="敌人档案" description="攻击/技能每行一条，用“|”分隔字段。">
      {draft.enemyProfiles.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">暂无敌人。</p>
      ) : (
        <div className="space-y-3">
          {draft.enemyProfiles.map((enemy, index) => (
            <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs" key={enemy.id}>
              <div className="grid gap-3 lg:grid-cols-[1fr_6rem]">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">编号</Label>
                    <Input
                      size="sm"
                      value={enemy.id}
                      onChange={(event) => handleEnemyChange(index, 'id', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">名称</Label>
                    <Input
                      size="sm"
                      value={enemy.name}
                      onChange={(event) => handleEnemyChange(index, 'name', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">类型</Label>
                    <Input
                      size="sm"
                      value={enemy.type}
                      onChange={(event) => handleEnemyChange(index, 'type', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">威胁等级</Label>
                    <Input
                      size="sm"
                      value={enemy.threat}
                      onChange={(event) => handleEnemyChange(index, 'threat', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">简介</Label>
                    <Textarea
                      rows={2}
                      value={enemy.summary}
                      onChange={(event) => handleEnemyChange(index, 'summary', event.target.value)}
                    />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3 lg:col-span-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">HP</Label>
                      <Input
                        size="sm"
                        value={enemy.hp}
                        onChange={(event) => handleEnemyChange(index, 'hp', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">护甲</Label>
                      <Input
                        size="sm"
                        value={enemy.armor}
                        onChange={(event) => handleEnemyChange(index, 'armor', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">移动</Label>
                      <Input
                        size="sm"
                        value={enemy.move}
                        onChange={(event) => handleEnemyChange(index, 'move', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">攻击（名称 | 命中 | 伤害 | 效果）</Label>
                    <Textarea
                      rows={3}
                      value={enemy.attacksText}
                      onChange={(event) => handleEnemyChange(index, 'attacksText', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">技能（名称 | 值）</Label>
                    <Textarea
                      rows={3}
                      value={enemy.skillsText}
                      onChange={(event) => handleEnemyChange(index, 'skillsText', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">特性（每行一条）</Label>
                    <Textarea
                      rows={2}
                      value={enemy.traitsText}
                      onChange={(event) => handleEnemyChange(index, 'traitsText', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">战术</Label>
                    <Textarea
                      rows={2}
                      value={enemy.tactics}
                      onChange={(event) => handleEnemyChange(index, 'tactics', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">弱点</Label>
                    <Input
                      size="sm"
                      value={enemy.weakness}
                      onChange={(event) => handleEnemyChange(index, 'weakness', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">理智损失</Label>
                    <Input
                      size="sm"
                      value={enemy.sanityLoss}
                      onChange={(event) => handleEnemyChange(index, 'sanityLoss', event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <Button onClick={() => handleRemoveEnemy(index)} size="xs" variant="destructive-outline">
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleAddEnemy} size="sm" variant="outline">
        添加敌人
      </Button>
    </Section>
  );
}
