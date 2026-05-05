import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { buildPlayGameUrl, getRuntimeConfig } from '@/lib/config/runtime';
import { createGame, getCharacterById, getModuleById } from '@/lib/db/repositories';
import { PLAY_MANAGED_SESSION_ID } from '@/lib/game/runtime';
import type { CharacterRecord, ModuleRecord } from '@/lib/game/types';
import { createGameplaySession } from '@/lib/opencode/gameplay';
import { ensureWorkspace } from '@/lib/opencode/workspace';

type CreateGameRequest = {
  moduleId?: string;
  characterId?: string;
};

async function readSystemPrompt(): Promise<string> {
  const filePath = join(process.cwd(), '..', '..', 'prompts', 'dm-system-prompt.md');
  return readFile(filePath, 'utf8');
}

export async function POST(request: Request) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const runtime = getRuntimeConfig();
  if (runtime.gameCreationMode === 'play' && !runtime.playBaseUrl) {
    return NextResponse.json({ error: 'play 服务入口未配置' }, { status: 503 });
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
  let systemPrompt: string | null;
  try {
    [moduleRecord, characterRecord, systemPrompt] = await Promise.all([
      getModuleById(moduleId),
      getCharacterById(characterId),
      runtime.gameCreationMode === 'opencode' ? readSystemPrompt() : Promise.resolve(null),
    ]);
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
  } catch (error) {
    console.error('[api/games] 创建工作区失败', error);
    return NextResponse.json({ error: '创建游戏失败' }, { status: 500 });
  }

  let opencodeSessionId = PLAY_MANAGED_SESSION_ID;
  if (runtime.gameCreationMode === 'opencode') {
    try {
      const opencodeSession = await createGameplaySession({
        title: `${moduleRecord.title} · ${characterRecord.name}`,
        workspacePath,
        moduleRecord,
        characterRecord,
        systemPrompt: systemPrompt ?? '',
      });
      opencodeSessionId = opencodeSession.id;
    } catch (error) {
      console.error('[api/games] 创建 opencode session 失败', error);
      return NextResponse.json({ error: '游戏服务暂不可用，请稍后重试' }, { status: 502 });
    }
  }

  try {
    const game = await createGame({
      id: gameId,
      userId: session.userId,
      moduleId: moduleRecord.id,
      characterId: characterRecord.id,
      opencodeSessionId,
      workspacePath,
    });

    return NextResponse.json({ game, playUrl: buildPlayGameUrl(game.id) }, { status: 201 });
  } catch (error) {
    console.error('[api/games] 写入游戏记录失败', error);
    return NextResponse.json({ error: '创建游戏失败' }, { status: 500 });
  }
}
