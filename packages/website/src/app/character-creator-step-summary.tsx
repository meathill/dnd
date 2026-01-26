import type { AttributeOption, FormState, SkillOption } from './character-creator-data';

type CharacterCreatorStepSummaryProps = {
  formState: FormState;
  selectedSkills: SkillOption[];
  inventoryList: string[];
  attributeOptions: AttributeOption[];
};

export default function CharacterCreatorStepSummary({
  formState,
  selectedSkills,
  inventoryList,
  attributeOptions,
}: CharacterCreatorStepSummaryProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="panel-muted space-y-4 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-lg bg-[rgba(255,255,255,0.7)] p-1">
            {formState.avatar ? (
              <img className="h-full w-full rounded-lg object-cover" src={formState.avatar} alt="角色头像预览" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-lg text-[10px] text-[var(--ink-soft)]">
                头像
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-[var(--ink-soft)]">角色</p>
            <p className="text-lg font-semibold text-[var(--ink-strong)]">{formState.name || '未命名'}</p>
            <p className="text-sm text-[var(--ink-muted)]">
              {formState.occupation || '未设置职业'} · {formState.age || '--'} 岁 · {formState.origin || '--'}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">主要属性</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[var(--ink-muted)]">
            {attributeOptions.map((attribute) => (
              <div className="flex items-center justify-between" key={attribute.id}>
                <span>{attribute.label}</span>
                <span className="font-mono text-[var(--ink-strong)]">{formState.attributes[attribute.id]}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-[var(--ink-muted)]">
            <span>幸运值</span>
            <span className="font-mono text-[var(--ink-strong)]">{formState.luck}</span>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">增益 / 减益</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {formState.buffs.length === 0 && formState.debuffs.length === 0 ? (
              <span className="text-xs text-[var(--ink-soft)]">暂无状态</span>
            ) : null}
            {formState.buffs.map((buff) => (
              <span
                className="rounded-lg bg-[rgba(61,82,56,0.16)] px-3 py-1 text-xs text-[var(--accent-moss)]"
                key={buff}
              >
                {buff}
              </span>
            ))}
            {formState.debuffs.map((debuff) => (
              <span
                className="rounded-lg bg-[rgba(176,74,53,0.16)] px-3 py-1 text-xs text-[var(--accent-ember)]"
                key={debuff}
              >
                {debuff}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="panel-muted rounded-xl p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">技能与装备</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedSkills.length === 0 ? (
              <span className="text-xs text-[var(--ink-soft)]">暂无技能</span>
            ) : (
              selectedSkills.map((skill) => (
                <span
                  className="rounded-lg bg-[rgba(61,82,56,0.12)] px-3 py-1 text-xs text-[var(--accent-moss)]"
                  key={skill.id}
                >
                  {skill.label} {formState.skills[skill.id] ?? 0}
                </span>
              ))
            )}
          </div>
          <div className="mt-3 text-sm text-[var(--ink-muted)]">
            {inventoryList.length === 0 ? '暂无装备' : inventoryList.join('、')}
          </div>
        </div>
        <div className="panel-muted rounded-xl p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">背景与动机</p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">{formState.background || '尚未填写'}</p>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">{formState.motivation || '尚未填写'}</p>
        </div>
      </div>
    </div>
  );
}
