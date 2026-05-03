import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth/session';
import { createGame, getCharacterById, getModuleById } from '@/lib/db/repositories';
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

  const [moduleRecord, characterRecord, systemPrompt] = await Promise.all([
    getModuleById(moduleId),
    getCharacterById(characterId),
    readSystemPrompt(),
  ]);

  if (!moduleRecord || !characterRecord) {
    return NextResponse.json({ error: '模组或人物卡不存在' }, { status: 404 });
  }

  const gameId = randomUUID();
  const workspacePath = await ensureWorkspace(session.userId, gameId);
  const opencodeSession = await createGameplaySession({
    title: `${moduleRecord.title} · ${characterRecord.name}`,
    workspacePath,
    moduleRecord,
    characterRecord,
    systemPrompt,
  });

  const game = await createGame({
    userId: session.userId,
    moduleId: moduleRecord.id,
    characterId: characterRecord.id,
    opencodeSessionId: opencodeSession.id,
    workspacePath,
  });

  return NextResponse.json({ game }, { status: 201 });
}
