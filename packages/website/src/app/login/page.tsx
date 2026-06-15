import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card } from '@/components/card';
import { LoginForm } from '@/components/login-form';
import { getRequestSession } from '@/lib/auth/session';

export default async function LoginPage() {
  const session = await getRequestSession();
  if (session) {
    redirect('/');
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 py-6 lg:grid-cols-[1fr_minmax(0,1fr)] lg:items-center">
      <div className="space-y-5">
        <Link className="text-sm uppercase tracking-[0.22em] text-zinc-500 hover:text-zinc-900" href="/">
          ← 肉团长
        </Link>
        <h1 className="text-4xl font-semibold leading-tight text-zinc-950">登录，挑一个模组开始今晚的故事</h1>
        <p className="max-w-lg text-zinc-600">
          按回合扣费、跨设备同步、新模组先收藏后开始。Editor 角色还可以用对话直接创作新模组。
        </p>
        <ul className="space-y-2 text-sm text-zinc-600">
          <li>· 邮箱注册即可使用，不需要验证邮件。</li>
          <li>· 新账号默认有体验回合。</li>
          <li>· 想成为编辑请联系管理员把你的邮箱加进 ADMIN_EMAILS / editor 名单。</li>
        </ul>
      </div>
      <Card className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">账户</p>
          <h2 className="text-2xl font-semibold text-zinc-950">登录或注册</h2>
          <p className="text-sm text-zinc-500">用邮箱即可，新用户会自动建账号。</p>
        </div>
        <LoginForm />
      </Card>
    </div>
  );
}
