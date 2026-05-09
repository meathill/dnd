import { NextResponse } from 'next/server';
import {
  AgentServerUnavailableError,
  fetchAgentSessionData,
  isAgentServerConfigured,
  publishAgentSession,
} from '@/lib/agent/client';
import { publishModuleDraft, updateModuleDraftData } from '@/lib/db/module-drafts-repo';
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

  // 1. 如果接了 agent-server，先把最新 module data 从 VPS workspace 拉回，覆盖 DB 中的 data_json。
  let workingDraft = access.draft;
  if (workingDraft.agentSessionId && (await isAgentServerConfigured())) {
    try {
      const snapshot = await fetchAgentSessionData(workingDraft.agentSessionId, workingDraft.slug);
      if (snapshot.moduleData) {
        await updateModuleDraftData(workingDraft.id, snapshot.moduleData);
        workingDraft = { ...workingDraft, data: snapshot.moduleData };
      }
    } catch (error) {
      if (!(error instanceof AgentServerUnavailableError)) {
        console.error('[api/module-drafts/publish] 同步 agent 数据失败', error);
      }
    }
  }

  // 2. 写 modules 表
  const result = await publishModuleDraft({ draft: workingDraft });

  // 3. 通知 agent-server 把 session workspace 复制到 published 目录（VPS 侧）
  let agentPublished = false;
  if (workingDraft.agentSessionId && (await isAgentServerConfigured())) {
    try {
      await publishAgentSession(workingDraft.agentSessionId, result.moduleId);
      agentPublished = true;
    } catch (error) {
      if (!(error instanceof AgentServerUnavailableError)) {
        console.error('[api/module-drafts/publish] 调用 agent publish 失败', error);
      }
    }
  }

  // 4. worker 侧本地 workspace 物化（如果配置了 OPENCODE_WORKSPACE_ROOT）。
  //    生产环境 agent-server 已经把内容放在 VPS 上，玩家创建 game 时由 worker 调 agent 拷贝；
  //    这里的本地物化主要是 dev / 单机部署兜底。
  if (!agentPublished) {
    const publishedPath = await ensurePublishedModuleWorkspace(result.moduleId);
    await copyDirectoryIfExists(workingDraft.workspacePath, publishedPath);
    await writeWorkspaceJsonFile(`${publishedPath}/data/modules/${result.moduleId}.json`, result.module.data);
  }

  return NextResponse.json({ moduleId: result.moduleId, module: result.module, agentPublished });
}
