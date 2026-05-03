'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '@/lib/auth/auth-client';
import { Button } from './button';
import { Input } from './input';

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage('');
    try {
      if (mode === 'signup') {
        await authClient.signUp.email({
          name: displayName,
          email,
          password,
        });
      } else {
        await authClient.signIn.email({ email, password });
      }
      router.push('/');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex gap-2 rounded-lg bg-zinc-100 p-1 text-sm">
        <button
          className={mode === 'login' ? 'rounded-md bg-white px-3 py-2 font-medium text-zinc-950' : 'px-3 py-2 text-zinc-500'}
          onClick={() => setMode('login')}
          type="button"
        >
          登录
        </button>
        <button
          className={mode === 'signup' ? 'rounded-md bg-white px-3 py-2 font-medium text-zinc-950' : 'px-3 py-2 text-zinc-500'}
          onClick={() => setMode('signup')}
          type="button"
        >
          注册
        </button>
      </div>
      {mode === 'signup' ? (
        <label className="block space-y-2">
          <span className="text-sm text-zinc-600">昵称</span>
          <Input onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
        </label>
      ) : null}
      <label className="block space-y-2">
        <span className="text-sm text-zinc-600">邮箱</span>
        <Input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-zinc-600">密码</span>
        <Input onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
      </label>
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      <Button className="w-full" disabled={isPending} type="submit">
        {isPending ? '处理中...' : mode === 'signup' ? '注册并进入' : '登录'}
      </Button>
    </form>
  );
}
