import {
  fieldLabelClassName,
  inputClassName,
  type FormState,
  type SkillOption,
  type ToggleSkill,
  type UpdateField,
} from './character-creator-data';

type CharacterCreatorStepSkillsProps = {
  formState: FormState;
  skillOptions: SkillOption[];
  equipmentOptions: string[];
  selectedEquipment: string[];
  selectedSkills: SkillOption[];
  onToggleSkill: ToggleSkill;
  onToggleEquipment: (equipment: string) => void;
  onFieldChange: UpdateField;
  skillLimit?: number;
  equipmentLimit?: number;
  skillError?: string;
  equipmentError?: string;
};

export default function CharacterCreatorStepSkills({
  formState,
  skillOptions,
  equipmentOptions,
  selectedEquipment,
  selectedSkills,
  onToggleSkill,
  onToggleEquipment,
  onFieldChange,
  skillLimit = 0,
  equipmentLimit = 0,
  skillError,
  equipmentError,
}: CharacterCreatorStepSkillsProps) {
  const isEquipmentRestricted = equipmentOptions.length > 0;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={fieldLabelClassName}>技能选择</p>
          {skillLimit > 0 ? (
            <span className="text-xs text-[var(--ink-soft)]">
              已选 {selectedSkills.length} / {skillLimit}
            </span>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {skillOptions.map((skill) => (
            <button
              className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                formState.skills[skill.id]
                  ? 'border-[rgba(61,82,56,0.4)] bg-[rgba(61,82,56,0.12)] text-[var(--accent-moss)]'
                  : 'border-[rgba(27,20,12,0.1)] bg-[rgba(255,255,255,0.7)] text-[var(--ink-muted)]'
              }`}
              onClick={() => onToggleSkill(skill.id)}
              type="button"
              key={skill.id}
            >
              <span>{skill.label}</span>
              <span className="text-xs text-[var(--ink-soft)]">{skill.group}</span>
            </button>
          ))}
        </div>
        {skillError ? <p className="text-xs text-[var(--accent-ember)]">{skillError}</p> : null}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className={fieldLabelClassName}>装备与道具</p>
          {equipmentLimit > 0 ? (
            <span className="text-xs text-[var(--ink-soft)]">
              已选 {selectedEquipment.length} / {equipmentLimit}
            </span>
          ) : null}
        </div>
        {equipmentOptions.length > 0 ? (
          <div className="flex flex-wrap gap-2 rounded-xl border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.5)] p-3 text-xs">
            {equipmentOptions.map((item) => {
              const isSelected = selectedEquipment.includes(item);
              return (
                <button
                  className={`rounded-lg px-3 py-1 transition ${
                    isSelected
                      ? 'bg-[rgba(182,121,46,0.18)] text-[var(--accent-brass)]'
                      : 'border border-[rgba(27,20,12,0.12)] text-[var(--ink-muted)]'
                  }`}
                  key={item}
                  onClick={() => onToggleEquipment(item)}
                  type="button"
                >
                  {item}
                </button>
              );
            })}
          </div>
        ) : null}
        <textarea
          className={`${inputClassName} min-h-[160px] ${isEquipmentRestricted ? 'cursor-not-allowed opacity-80' : ''}`}
          placeholder={isEquipmentRestricted ? '从清单选择装备' : '用逗号分隔物品，例如：圣水、手电筒'}
          readOnly={isEquipmentRestricted}
          rows={6}
          value={formState.inventory}
          onChange={(event) => onFieldChange('inventory', event.target.value)}
        ></textarea>
        {equipmentError ? <p className="text-xs text-[var(--accent-ember)]">{equipmentError}</p> : null}
        <div className="panel-muted rounded-xl p-4">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">已选技能</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedSkills.length === 0 ? (
              <span className="text-xs text-[var(--ink-soft)]">暂无选择</span>
            ) : (
              selectedSkills.map((skill) => (
                <span
                  className="rounded-lg bg-[rgba(61,82,56,0.12)] px-3 py-1 text-xs text-[var(--accent-moss)]"
                  key={skill.id}
                >
                  {skill.label}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
