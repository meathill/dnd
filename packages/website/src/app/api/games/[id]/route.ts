import { NextResponse } from 'next/server';
import { buildPlayGameUrl } from '@/lib/config/runtime';
import { getCharacterById, getGameByIdForUser, getModuleById, listMessagesByGameId } from '@/lib/db/repositories';
import { getRequestIdentity } from '@/lib/internal/request-auth';

type GameRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: GameRouteProps) {
  const identity = await getRequestIdentity(request);
  if (identity instanceof NextResponse) {
    return identity;
  }
  const { id } = await params;
  const game = await getGameByIdForUser(id, identity.userId);
  if (!game) {
    return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
  }
  const [moduleRecord, characterRecord, messages] = await Promise.all([
    getModuleById(game.moduleId),
    getCharacterById(game.characterId),
    listMessagesByGameId(game.id),
  ]);
  return NextResponse.json({
    game,
    playUrl: buildPlayGameUrl(game.id),
    module: moduleRecord,
    character: characterRecord,
    messages,
  });
}
