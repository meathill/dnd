import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
  fieldLabelClassName,
  getBuffTooltip,
  getDebuffTooltip,
  type FormState,
  type ToggleBuff,
  type ToggleDebuff,
  type UpdateField,
} from './character-creator-data';

type CharacterCreatorStepBackgroundProps = {
  formState: FormState;
  buffOptions: string[];
  debuffOptions: string[];
  buffLimit?: number;
  debuffLimit?: number;
  buffError?: string;
  debuffError?: string;
  onFieldChange: UpdateField;
  onToggleBuff: ToggleBuff;
  onToggleDebuff: ToggleDebuff;
};

export default function CharacterCreatorStepBackground({
  formState,
  buffOptions,
  debuffOptions,
  buffLimit = 0,
  debuffLimit = 0,
  buffError,
  debuffError,
  onFieldChange,
  onToggleBuff,
  onToggleDebuff,
}: CharacterCreatorStepBackgroundProps) {
  const shouldShowDebuff = debuffOptions.length > 0 && debuffLimit > 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between">
            <p className={fieldLabelClassName}>增益状态</p>
            {buffLimit > 0 ? (
              <span className="text-xs text-[var(--ink-soft)]">
                已选 {formState.buffs.length} / {buffLimit}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {buffOptions.map((buff) => (
              <Button
                className={`h-auto rounded-lg px-3 py-1 text-xs transition ${
                  formState.buffs.includes(buff)
                    ? 'bg-[rgba(61,82,56,0.16)] text-[var(--accent-moss)]'
                    : 'bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]'
                }`}
                onClick={() => onToggleBuff(buff)}
                type="button"
                title={getBuffTooltip(buff)}
                key={buff}
                variant="ghost"
              >
                {buff}
              </Button>
            ))}
          </div>
          {buffError ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{buffError}</p> : null}
        </div>

        {shouldShowDebuff ? (
          <div>
            <div className="flex items-center justify-between">
              <p className={fieldLabelClassName}>减益状态</p>
              <span className="text-xs text-[var(--ink-soft)]">
                已选 {formState.debuffs.length} / {debuffLimit}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {debuffOptions.map((debuff) => (
                <Button
                  className={`h-auto rounded-lg px-3 py-1 text-xs transition ${
                    formState.debuffs.includes(debuff)
                      ? 'bg-[rgba(176,74,53,0.16)] text-[var(--accent-ember)]'
                      : 'bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]'
                  }`}
                  onClick={() => onToggleDebuff(debuff)}
                  type="button"
                  title={getDebuffTooltip(debuff)}
                  key={debuff}
                  variant="ghost"
                >
                  {debuff}
                </Button>
              ))}
            </div>
            {debuffError ? <p className="mt-2 text-xs text-[var(--accent-ember)]">{debuffError}</p> : null}
          </div>
        ) : null}

        <div>
          <p className={fieldLabelClassName}>行为习惯</p>
          <Textarea
            className="mt-3 min-h-[120px] bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
            placeholder="角色的口头禅、习惯动作、禁忌"
            rows={4}
            value={formState.note}
            onChange={(event) => onFieldChange('note', event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className={fieldLabelClassName}>背景设定</p>
        <Textarea
          className="min-h-[140px] bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
          placeholder="经历、线索、与模组相关的过去"
          rows={5}
          value={formState.background}
          onChange={(event) => onFieldChange('background', event.target.value)}
        />
        <Textarea
          className="min-h-[120px] bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
          placeholder="角色动机、近期目标"
          rows={4}
          value={formState.motivation}
          onChange={(event) => onFieldChange('motivation', event.target.value)}
        />
      </div>
    </div>
  );
}
