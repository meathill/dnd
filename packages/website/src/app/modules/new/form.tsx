'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Textarea } from '@/components/textarea';

const DIFFICULTY_OPTIONS = ['新手', '中等', '困难'];

export function ModuleDraftForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [setting, setSetting] = useState('');
  const [difficulty, setDifficulty] = useState('中等');
  const [ruleset, setRuleset] = useState('coc-7e-lite');
  const slugId = useId();
  const titleId = useId();
  const summaryId = useId();
  const settingId = useId();
  const difficultyId = useId();
  const rulesetId = useId();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch('/api/module-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          summary,
          setting,
          difficulty,
          meta: { ruleset },
        }),
      });
      const payload = (await response.json().catch(() => null)) as { draft?: { id: string }; error?: string } | null;
      if (!response.ok || !payload?.draft) {
        setError(payload?.error ?? '创建失败');
        return;
      }
      router.push(`/modules/drafts/${payload.draft.id}`);
    });
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-1 text-sm">
        <label className="text-zinc-700" htmlFor={slugId}>
          URL slug
        </label>
        <Input
          id={slugId}
          required
          minLength={2}
          maxLength={64}
          pattern="[a-z0-9][a-z0-9_-]+"
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="例如：haunted-mansion"
        />
        <span className="text-xs text-zinc-500">仅小写字母、数字、- 和 _，2-64 字符</span>
      </div>
      <div className="grid gap-1 text-sm">
        <label className="text-zinc-700" htmlFor={titleId}>
          标题
        </label>
        <Input
          id={titleId}
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="模组标题"
        />
      </div>
      <div className="grid gap-1 text-sm">
        <label className="text-zinc-700" htmlFor={summaryId}>
          摘要
        </label>
        <Textarea
          id={summaryId}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="一两句话描述卖点"
        />
      </div>
      <div className="grid gap-1 text-sm">
        <label className="text-zinc-700" htmlFor={settingId}>
          设定
        </label>
        <Input
          id={settingId}
          value={setting}
          onChange={(event) => setSetting(event.target.value)}
          placeholder="时代 / 地点 / 氛围"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1 text-sm">
          <label className="text-zinc-700" htmlFor={difficultyId}>
            难度
          </label>
          <select
            id={difficultyId}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-900"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1 text-sm">
          <label className="text-zinc-700" htmlFor={rulesetId}>
            规则书
          </label>
          <Input
            id={rulesetId}
            value={ruleset}
            onChange={(event) => setRuleset(event.target.value)}
            placeholder="coc-7e-lite"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div>
        <Button disabled={isPending} type="submit">
          {isPending ? '创建中…' : '创建草稿并进入会话'}
        </Button>
      </div>
    </form>
  );
}
