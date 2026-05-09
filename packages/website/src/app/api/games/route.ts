import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { buildGameHref } from '@/lib/config/runtime';
import { getCharacterById } from '@/lib/db/characters-repo';
import { createGame } from '@/lib/db/games-repo';
import { getModuleById } from '@/lib/db/modules-repo';
import { LOCAL_RUNTIME_SESSION_ID } from '@/lib/game/runtime';
import type { CharacterRecord, ModuleRecord } from '@/lib/game/types';
import { ensureWorkspace, materializeModuleIntoGameWorkspace } from '@/lib/opencode/workspace';

type CreateGameRequest = {
  moduleId?: string;
  characterId?: string;
};

export async function POST(request: Request) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  let body: CreateGameRequest;
  try {
    body = (await request.json()) as CreateGameRequest;
  } catch {
    return NextResponse.json({ error: '无效请求体' }, { status: 400 });
  }

  const moduleId = body.moduleId?.trim();
  const characterId = body.characterId?.trim();
  if (!moduleId || !characterId) {
    return NextResponse.json({ error: '缺少模组或人物卡' }, { status: 400 });
  }

  let moduleRecord: ModuleRecord | null;
  let characterRecord: CharacterRecord | null;
  try {
    [moduleRecord, characterRecord] = await Promise.all([getModuleById(moduleId), getCharacterById(characterId)]);
  } catch (error) {
    console.error('[api/games] 加载游戏资源失败', error);
    return NextResponse.json({ error: '创建游戏失败' }, { status: 500 });
  }

  if (!moduleRecord || !characterRecord) {
    return NextResponse.json({ error: '模组或人物卡不存在' }, { status: 404 });
  }

  if (characterRecord.moduleId !== moduleRecord.id) {
    return NextResponse.json({ error: '人物卡不属于该模组' }, { status: 400 });
  }

  const gameId = randomUUID();
  let workspacePath: string;
  try {
    workspacePath = await ensureWorkspace(session.userId, gameId);
    await materializeModuleIntoGameWorkspace({
      moduleId: moduleRecord.id,
      moduleData: moduleRecord.data,
      gameWorkspacePath: workspacePath,
    });
  } catch (error) {
    console.error('[api/games] 创建工作区失败', error);
    return NextResponse.json({ error: '创建游戏失败' }, { status: 500 });
  }

  try {
    const game = await createGame({
      id: gameId,
      userId: session.userId,
      moduleId: moduleRecord.id,
      characterId: characterRecord.id,
      opencodeSessionId: LOCAL_RUNTIME_SESSION_ID,
      workspacePath,
    });

    return NextResponse.json({ game, gameUrl: buildGameHref(game.id) }, { status: 201 });
  } catch (error) {
    console.error('[api/games] 写入游戏记录失败', error);
    return NextResponse.json({ error: '创建游戏失败' }, { status: 500 });
  }
}
