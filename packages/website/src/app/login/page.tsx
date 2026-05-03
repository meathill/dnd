import { Card } from '@/components/card';
import { LoginForm } from '@/components/login-form';

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">账户</p>
          <h1 className="text-3xl font-semibold text-zinc-950">登录或注册</h1>
          <p className="text-sm text-zinc-600">登录后即可查看模组、开始游戏，并按回合扣费。</p>
        </div>
        <LoginForm />
      </Card>
    </div>
  );
}
