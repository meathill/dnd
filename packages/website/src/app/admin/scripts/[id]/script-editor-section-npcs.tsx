'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Section } from './script-editor-section';
import type { ScriptDraft } from './script-editor-types';
import type { DraftMutator } from './script-editor-form';
import { createNpcProfileDraft } from './script-editor-mappers';

type ScriptNpcSectionProps = {
  draft: ScriptDraft;
  mutateDraft: DraftMutator;
};

const roleOptions = [
  { value: 'ally', label: '友方' },
  { value: 'neutral', label: '中立' },
  { value: 'enemy', label: '敌对' },
];

export default function ScriptNpcSection({ draft, mutateDraft }: ScriptNpcSectionProps) {
  function handleNpcChange(index: number, field: keyof ScriptDraft['npcProfiles'][number], value: string) {
    mutateDraft((next) => {
      next.npcProfiles[index][field] = value;
    });
  }

  function handleAddNpc() {
    mutateDraft((next) => {
      next.npcProfiles.push(createNpcProfileDraft());
    });
  }

  function handleRemoveNpc(index: number) {
    mutateDraft((next) => {
      next.npcProfiles.splice(index, 1);
    });
  }

  return (
    <Section id="script-section-npcs" title="NPC 档案" description="攻击/技能每行一条，用“|”分隔字段。">
      {draft.npcProfiles.length === 0 ? (
        <p className="text-xs text-[var(--ink-muted)]">暂无 NPC。</p>
      ) : (
        <div className="space-y-3">
          {draft.npcProfiles.map((npc, index) => (
            <div className="rounded-lg border border-[rgba(27,20,12,0.08)] bg-white/70 p-3 text-xs" key={npc.id}>
              <div className="grid gap-3 lg:grid-cols-[1fr_6rem]">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">编号</Label>
                    <Input
                      size="sm"
                      value={npc.id}
                      onChange={(event) => handleNpcChange(index, 'id', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">名称</Label>
                    <Input
                      size="sm"
                      value={npc.name}
                      onChange={(event) => handleNpcChange(index, 'name', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">类型</Label>
                    <Input
                      size="sm"
                      value={npc.type}
                      onChange={(event) => handleNpcChange(index, 'type', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">立场</Label>
                    <Select value={npc.role} onValueChange={(value) => handleNpcChange(index, 'role', value)}>
                      <SelectTrigger size="sm">
                        <SelectValue placeholder="选择立场" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">威胁 / 影响</Label>
                    <Input
                      size="sm"
                      value={npc.threat}
                      onChange={(event) => handleNpcChange(index, 'threat', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">简介</Label>
                    <Textarea
                      rows={2}
                      value={npc.summary}
                      onChange={(event) => handleNpcChange(index, 'summary', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">使用时机</Label>
                    <Textarea
                      rows={2}
                      value={npc.useWhen}
                      onChange={(event) => handleNpcChange(index, 'useWhen', event.target.value)}
                      placeholder="何时介入、何时出现或提供帮助"
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">初始状态</Label>
                    <Textarea
                      rows={2}
                      value={npc.status}
                      onChange={(event) => handleNpcChange(index, 'status', event.target.value)}
                      placeholder="伤势、态度、是否在场等"
                    />
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3 lg:col-span-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">HP</Label>
                      <Input
                        size="sm"
                        value={npc.hp}
                        onChange={(event) => handleNpcChange(index, 'hp', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">护甲</Label>
                      <Input
                        size="sm"
                        value={npc.armor}
                        onChange={(event) => handleNpcChange(index, 'armor', event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-[var(--ink-soft)]">移动</Label>
                      <Input
                        size="sm"
                        value={npc.move}
                        onChange={(event) => handleNpcChange(index, 'move', event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">攻击（名称 | 命中 | 伤害 | 效果）</Label>
                    <Textarea
                      rows={3}
                      value={npc.attacksText}
                      onChange={(event) => handleNpcChange(index, 'attacksText', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">技能（名称 | 值）</Label>
                    <Textarea
                      rows={3}
                      value={npc.skillsText}
                      onChange={(event) => handleNpcChange(index, 'skillsText', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">特性（每行一条）</Label>
                    <Textarea
                      rows={2}
                      value={npc.traitsText}
                      onChange={(event) => handleNpcChange(index, 'traitsText', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1 lg:col-span-2">
                    <Label className="text-[10px] text-[var(--ink-soft)]">战术</Label>
                    <Textarea
                      rows={2}
                      value={npc.tactics}
                      onChange={(event) => handleNpcChange(index, 'tactics', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">弱点</Label>
                    <Input
                      size="sm"
                      value={npc.weakness}
                      onChange={(event) => handleNpcChange(index, 'weakness', event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-[var(--ink-soft)]">理智损失</Label>
                    <Input
                      size="sm"
                      value={npc.sanityLoss}
                      onChange={(event) => handleNpcChange(index, 'sanityLoss', event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-start justify-end">
                  <Button onClick={() => handleRemoveNpc(index)} size="xs" variant="destructive-outline">
                    删除
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Button onClick={handleAddNpc} size="sm" variant="outline">
        添加 NPC
      </Button>
    </Section>
  );
}
