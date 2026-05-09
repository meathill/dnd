import { NextResponse } from 'next/server';
import { publishModuleDraft } from '@/lib/db/module-drafts-repo';
import { loadDraftForOwner } from '@/lib/internal/draft-auth';
import {
  copyDirectoryIfExists,
  ensurePublishedModuleWorkspace,
  writeWorkspaceJsonFile,
} from '@/lib/opencode/workspace';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await loadDraftForOwner(id);
  if (access instanceof NextResponse) {
    return access;
  }
  if (access.draft.status === 'published') {
    return NextResponse.json({ error: '该草稿已发布' }, { status: 400 });
  }

  const result = await publishModuleDraft({ draft: access.draft });
  const publishedPath = await ensurePublishedModuleWorkspace(result.moduleId);
  await copyDirectoryIfExists(access.draft.workspacePath, publishedPath);
  await writeWorkspaceJsonFile(`${publishedPath}/data/modules/${result.moduleId}.json`, result.module.data);

  return NextResponse.json({ moduleId: result.moduleId, module: result.module });
}
