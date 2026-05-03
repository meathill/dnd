'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { CharacterRecord } from '@/lib/game/types';
import { Button } from './button';

type StartGameFormProps = {
  moduleId: string;
  characters: CharacterRecord[];
};

export function StartGameForm({ moduleId, characters }: StartGameFormProps) {
  const router = useRouter();
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? '');
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, characterId }),
      });
      const payload = (await response.json()) as { game?: { id: string }; error?: string };
      if (!response.ok || !payload.game) {
        throw new Error(payload.error || '创建游戏失败');
      }
      router.push(`/games/${payload.game.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '创建游戏失败');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-zinc-900">选择人物卡</legend>
        {characters.map((character) => (
          <label className="flex cursor-pointer gap-3 rounded-xl border border-zinc-200 p-4" key={character.id}>
            <input
              checked={characterId === character.id}
              className="mt-1"
              name="characterId"
              onChange={() => setCharacterId(character.id)}
              type="radio"
              value={character.id}
            />
            <div className="space-y-1">
              <p className="font-medium text-zinc-950">{character.name}</p>
              <p className="text-sm text-zinc-600">{character.summary}</p>
            </div>
          </label>
        ))}
      </fieldset>
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      <Button disabled={!characterId || isPending} type="submit">
        {isPending ? '正在启动游戏...' : '开始游戏'}
      </Button>
    </form>
  );
}
