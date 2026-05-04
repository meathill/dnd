import { NextResponse } from 'next/server';
import { getPlayGameContext } from '@/lib/play/runtime';
import { getPlaySession } from '@/lib/play/session';

type GameRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: GameRouteProps) {
  const session = await getPlaySession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const gameContext = await getPlayGameContext(id, session);
    return NextResponse.json(gameContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : '读取游戏失败';
    const status = message === '游戏不存在' ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
