import { useEffect, useState, type ChangeEvent } from 'react';
import type { CharacterFieldErrors, ScriptOccupationOption } from '../lib/game/types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { fieldLabelClassName, type FormState, type UpdateField } from './character-creator-data';
import { generateAvatar, uploadAvatar } from '../lib/assets/upload-avatar';

type CharacterCreatorStepBasicProps = {
  formState: FormState;
  onFieldChange: UpdateField;
  occupationOptions?: ScriptOccupationOption[];
  originOptions?: string[];
  errors?: Pick<CharacterFieldErrors, 'name' | 'occupation' | 'origin'>;
};

export default function CharacterCreatorStepBasic({
  formState,
  onFieldChange,
  occupationOptions,
  originOptions,
  errors,
}: CharacterCreatorStepBasicProps) {
  const hasOccupationOptions = Boolean(occupationOptions && occupationOptions.length > 0);
  const hasOriginOptions = Boolean(originOptions && originOptions.length > 0);
  const occupationValue = hasOccupationOptions ? (occupationOptions?.[0]?.name ?? '') : formState.occupation;
  const originValue = hasOriginOptions ? (originOptions?.[0] ?? '') : formState.origin;
  const occupationNames = occupationOptions?.map((option) => option.name) ?? [];
  const [localPreview, setLocalPreview] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiError, setAiError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const avatarPreview = formState.avatar?.trim() || localPreview;
  const statusMessage = uploadError || aiError;
  const helperMessage = statusMessage
    ? statusMessage
    : isUploading
      ? '正在上传头像...'
      : isGenerating
        ? '正在生成头像...'
        : '建议使用正方形图片，便于显示。';
  const uploadHintTone = statusMessage ? 'text-[var(--accent-ember)]' : 'text-[var(--ink-soft)]';
  const isBusy = isUploading || isGenerating;

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      onFieldChange('avatar', '');
      setLocalPreview('');
      setUploadError('');
      setAiError('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      onFieldChange('avatar', '');
      setLocalPreview('');
      setUploadError('仅支持图片文件');
      setAiError('');
      return;
    }
    setUploadError('');
    setAiError('');
    setIsUploading(true);
    setLocalPreview(URL.createObjectURL(file));
    try {
      const url = await uploadAvatar(file);
      onFieldChange('avatar', url);
      setUploadError('');
      setLocalPreview('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '头像上传失败';
      setUploadError(message);
      onFieldChange('avatar', '');
      setLocalPreview('');
    } finally {
      setIsUploading(false);
    }
  }

  function buildAvatarPrompt(): string {
    const custom = aiPrompt.trim();
    if (custom) {
      return custom;
    }
    const parts = [formState.occupation, formState.appearance, formState.background].filter(Boolean);
    const detail = parts.join('，');
    if (detail) {
      return `克苏鲁调查员角色头像：${detail}。写实风格，半身像。`;
    }
    return '克苏鲁调查员角色头像，写实风格，半身像。';
  }

  async function handleGenerateAvatar() {
    const prompt = buildAvatarPrompt();
    if (!prompt) {
      setAiError('请填写头像描述');
      return;
    }
    setAiError('');
    setUploadError('');
    setIsGenerating(true);
    setLocalPreview('');
    try {
      const url = await generateAvatar(prompt);
      onFieldChange('avatar', url);
      setAiError('');
    } catch (error) {
      const message = error instanceof Error ? error.message : '头像生成失败';
      setAiError(message);
      onFieldChange('avatar', '');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div>
          <p className={fieldLabelClassName}>基本信息</p>
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3">
            <div className="h-16 w-16 rounded-lg bg-[rgba(255,255,255,0.6)] p-1">
              {avatarPreview ? (
                <img className="h-full w-full rounded-lg object-cover" src={avatarPreview} alt="角色头像" />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-lg text-xs text-[var(--ink-soft)]">
                  头像
                </div>
              )}
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-[var(--ink-soft)]" htmlFor="character-avatar">
                上传头像
              </Label>
              <Input
                aria-label="上传头像"
                className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                id="character-avatar"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                size="sm"
                disabled={isBusy}
              />
              <p className={`text-[10px] ${uploadHintTone}`}>{helperMessage}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 rounded-lg border border-[rgba(27,20,12,0.08)] bg-[rgba(255,255,255,0.7)] p-3">
            <Label className="text-xs text-[var(--ink-soft)]" htmlFor="avatar-ai-prompt">
              AI 头像描述（可选）
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="avatar-ai-prompt"
                className="min-w-[200px] flex-1 bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder="例如：年轻神父，温和但坚定"
                size="sm"
              />
              <Button onClick={handleGenerateAvatar} size="sm" variant="outline" disabled={isBusy}>
                {isGenerating ? '生成中...' : 'AI 生成'}
              </Button>
            </div>
            <p className="text-[10px] text-[var(--ink-soft)]">未填写时会自动用职业与外观生成描述。</p>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Input
                className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                aria-label="角色姓名"
                placeholder="角色姓名"
                value={formState.name}
                onChange={(event) => onFieldChange('name', event.target.value)}
                size="sm"
              />
              {errors?.name ? <p className="text-xs text-[var(--accent-ember)]">{errors.name}</p> : null}
            </div>
            <div className="space-y-1">
              {hasOccupationOptions ? (
                <Select
                  value={occupationNames.includes(formState.occupation) ? formState.occupation : occupationValue}
                  onValueChange={(value) => onFieldChange('occupation', value ?? '')}
                >
                  <SelectTrigger aria-label="职业" className="bg-[rgba(255,255,255,0.8)]" size="sm">
                    <SelectValue placeholder="职业" />
                  </SelectTrigger>
                  <SelectContent>
                    {occupationOptions?.map((option) => (
                      <SelectItem key={option.id} value={option.name}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  aria-label="职业"
                  className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                  placeholder="职业"
                  value={formState.occupation}
                  onChange={(event) => onFieldChange('occupation', event.target.value)}
                  size="sm"
                />
              )}
              {errors?.occupation ? <p className="text-xs text-[var(--accent-ember)]">{errors.occupation}</p> : null}
            </div>
            <div className="space-y-1">
              <Input
                className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                aria-label="年龄"
                placeholder="年龄"
                value={formState.age}
                onChange={(event) => onFieldChange('age', event.target.value)}
                size="sm"
              />
            </div>
            <div className="space-y-1">
              {hasOriginOptions ? (
                <Select
                  value={originOptions?.includes(formState.origin) ? formState.origin : originValue}
                  onValueChange={(value) => onFieldChange('origin', value ?? '')}
                >
                  <SelectTrigger aria-label="出身" className="bg-[rgba(255,255,255,0.8)]" size="sm">
                    <SelectValue placeholder="出身" />
                  </SelectTrigger>
                  <SelectContent>
                    {originOptions?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  aria-label="出身"
                  className="bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
                  placeholder="出身/城市"
                  value={formState.origin}
                  onChange={(event) => onFieldChange('origin', event.target.value)}
                  size="sm"
                />
              )}
              {errors?.origin ? <p className="text-xs text-[var(--accent-ember)]">{errors.origin}</p> : null}
            </div>
          </div>
        </div>

        <div>
          <p className={fieldLabelClassName}>外观与标签</p>
          <Textarea
            className="mt-3 min-h-[120px] bg-[rgba(255,255,255,0.8)] text-[var(--ink-strong)]"
            placeholder="外观、习惯或明显特征"
            rows={4}
            value={formState.appearance}
            onChange={(event) => onFieldChange('appearance', event.target.value)}
          />
        </div>
      </div>

      <div className="panel-muted rounded-lg p-4">
        <p className="text-sm font-semibold text-[var(--ink-strong)]">创角提示</p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--ink-muted)]">
          <li>职业决定了可学习技能与社交资源。</li>
          <li>年龄影响体力与经验，建议与模组时代匹配。</li>
          <li>写下明显特征，方便 DM 在叙事中抓取。</li>
        </ul>
      </div>
    </div>
  );
}
