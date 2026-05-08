import { NextResponse } from 'next/server';
import { getGameContext } from '@/lib/game/runtime';
import { getRequestIdentity } from '@/lib/internal/request-auth';

type GameRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: GameRouteProps) {
  const identity = await getRequestIdentity();
  if (identity instanceof NextResponse) {
    return identity;
  }
  try {
    const { id } = await params;
    return NextResponse.json(await getGameContext(id, identity.userId));
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取游戏失败';
    const status = message === '游戏不存在' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
