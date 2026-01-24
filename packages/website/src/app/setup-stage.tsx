'use client';

import { useState } from 'react';
import CharacterCreator from './character-creator';
import type { FormState, SubmitResult } from './character-creator-data';
import type { ScriptDefinition } from '../lib/game/types';
import { resolveAttributePointBudget, resolveAttributeRanges } from '../lib/game/rules';

const sectionTitleClassName = 'text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]';

export type SetupStageProps = {
  scripts: ScriptDefinition[];
  selectedScriptId: string | null;
  onSelectScript: (scriptId: string) => void;
  onClearScript: () => void;
  characterSummary: { name: string; occupation: string } | null;
  onCharacterComplete: (formState: FormState) => SubmitResult | Promise<SubmitResult>;
  canStart: boolean;
  isStarting: boolean;
  onStartGame: () => void;
  statusMessage: string;
};

export default function SetupStage({
  scripts,
  selectedScriptId,
  onSelectScript,
  onClearScript,
  characterSummary,
  onCharacterComplete,
  canStart,
  isStarting,
  onStartGame,
  statusMessage,
}: SetupStageProps) {
  const [openRequestId, setOpenRequestId] = useState(0);
  const selectedScript = selectedScriptId ? (scripts.find((script) => script.id === selectedScriptId) ?? null) : null;
  const isScriptSelected = Boolean(selectedScript);
  const effectiveAttributeRanges = selectedScript ? resolveAttributeRanges(selectedScript.attributeRanges) : undefined;
  const effectiveAttributePointBudget = selectedScript
    ? resolveAttributePointBudget(selectedScript.attributePointBudget)
    : undefined;

  function handleEditCharacter() {
    setOpenRequestId((value) => value + 1);
  }

  return (
    <div className="grid h-full gap-4 overflow-hidden p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="panel-card flex h-full flex-col gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>步骤 1</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">选择剧本</h2>
            <p className="text-sm text-[var(--ink-muted)]">先选剧本，再建卡，技能与装备会随剧本变化。</p>
            {selectedScript ? (
              <p className="mt-2 text-xs text-[var(--ink-soft)]">已选：{selectedScript.title}</p>
            ) : null}
          </div>
          {selectedScript ? (
            <button
              className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
              onClick={onClearScript}
              type="button"
            >
              重新选择剧本
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {scripts.map((script) => {
            const isSelected = script.id === selectedScriptId;
            return (
              <div
                className={`rounded-xl border p-4 text-sm transition ${
                  isSelected
                    ? 'border-[var(--accent-brass)] bg-[rgba(255,255,255,0.9)]'
                    : 'border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.6)]'
                }`}
                key={script.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--ink-strong)]">{script.title}</p>
                    <p className="text-xs text-[var(--ink-soft)]">{script.setting}</p>
                  </div>
                  <span className="rounded-lg border border-[rgba(27,20,12,0.12)] px-2 py-1 text-[10px] text-[var(--ink-soft)]">
                    {script.difficulty}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">{script.summary}</p>
                <div className="mt-3 grid gap-2 text-xs text-[var(--ink-soft)]">
                  <div>
                    <span className="font-semibold text-[var(--ink-strong)]">场景：</span>
                    {script.scenes.map((scene) => scene.title).join(' / ')}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--ink-strong)]">战斗：</span>
                    {script.encounters.map((encounter) => encounter.title).join(' / ')}
                  </div>
                </div>
                <button
                  className={`mt-4 w-full rounded-lg px-3 py-2 text-xs transition ${
                    isSelected
                      ? 'bg-[var(--accent-brass)] text-white'
                      : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-muted)] hover:border-[var(--accent-brass)]'
                  }`}
                  onClick={() => onSelectScript(script.id)}
                  type="button"
                >
                  {isSelected ? '已选择' : '选择剧本'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="panel-card flex h-full flex-col gap-4 rounded-xl p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={sectionTitleClassName}>步骤 2</p>
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">创建人物卡</h2>
            <p className="text-sm text-[var(--ink-muted)]">完成后即可开始冒险。</p>
          </div>
          {characterSummary ? (
            <button
              className="rounded-lg border border-[rgba(27,20,12,0.12)] px-3 py-1 text-xs text-[var(--ink-muted)]"
              onClick={handleEditCharacter}
              type="button"
            >
              继续编辑人物卡
            </button>
          ) : null}
        </div>

        <div className="rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.6)] p-4">
          <CharacterCreator
            key={selectedScriptId ?? 'no-script'}
            onComplete={onCharacterComplete}
            variant="compact"
            openRequestId={openRequestId}
            skillOptions={selectedScript?.skillOptions}
            equipmentOptions={selectedScript?.equipmentOptions}
            occupationOptions={selectedScript?.occupationOptions}
            originOptions={selectedScript?.originOptions}
            buffOptions={selectedScript?.buffOptions}
            debuffOptions={selectedScript?.debuffOptions}
            attributeRanges={effectiveAttributeRanges}
            attributePointBudget={effectiveAttributePointBudget}
            skillLimit={selectedScript?.skillLimit}
            equipmentLimit={selectedScript?.equipmentLimit}
            buffLimit={selectedScript?.buffLimit}
            debuffLimit={selectedScript?.debuffLimit}
            isDisabled={!isScriptSelected}
          />
          {characterSummary ? (
            <div className="mt-3 text-xs text-[var(--ink-muted)]">
              已创建：
              <span className="ml-1 font-semibold text-[var(--ink-strong)]">{characterSummary.name}</span>
              <span className="ml-2">{characterSummary.occupation}</span>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[var(--ink-soft)]">
              {isScriptSelected ? '尚未完成人物卡。' : '请先选择剧本后再创建人物卡。'}
            </p>
          )}
        </div>

        <button
          className={`mt-auto rounded-lg px-3 py-2 text-sm ${
            canStart && !isStarting
              ? 'bg-[var(--accent-brass)] text-white'
              : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-soft)]'
          }`}
          disabled={!canStart || isStarting}
          onClick={onStartGame}
          type="button"
        >
          {isStarting ? '正在进入' : '开始游戏'}
        </button>
        {statusMessage ? <p className="text-xs text-[var(--ink-soft)]">{statusMessage}</p> : null}
      </aside>
    </div>
  );
}
