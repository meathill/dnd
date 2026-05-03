import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { getCharacterById, getGameByIdForUser, getModuleById, listMessagesByGameId } from '@/lib/db/repositories';

type GameRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: GameRouteProps) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const { id } = await params;
  const game = await getGameByIdForUser(id, session.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }
  const [moduleRecord, characterRecord, messages] = await Promise.all([
    getModuleById(game.moduleId),
    getCharacterById(game.characterId),
    listMessagesByGameId(game.id),
  ]);
  return NextResponse.json({ game, module: moduleRecord, character: characterRecord, messages });
}
