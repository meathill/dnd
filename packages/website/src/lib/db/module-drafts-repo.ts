import { randomUUID } from 'node:crypto';
import type { ModuleDraftMessageRecord, ModuleDraftRecord, ModuleDraftStatus, ModuleRecord } from '../game/types';
import { buildTimestamp, getDatabase } from './db';

type ModuleDraftRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  setting: string;
  difficulty: string;
  owner_user_id: string;
  meta_json: string;
  data_json: string;
  workspace_path: string;
  status: string;
  published_module_id: string | null;
  skill_set: string;
  agent_session_id: string | null;
  created_at: string;
  updated_at: string;
};

type ModuleDraftMessageRow = {
  id: string;
  module_draft_id: string;
  role: 'user' | 'assistant';
  content: string;
  message_meta_json: string;
  created_at: string;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function normalizeStatus(value: string): ModuleDraftStatus {
  return value === 'published' ? 'published' : 'draft';
}

function mapDraft(row: ModuleDraftRow): ModuleDraftRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    setting: row.setting,
    difficulty: row.difficulty,
    ownerUserId: row.owner_user_id,
    meta: parseJson<Record<string, unknown>>(row.meta_json, {}),
    data: parseJson<Record<string, unknown>>(row.data_json, {}),
    workspacePath: row.workspace_path,
    status: normalizeStatus(row.status),
    publishedModuleId: row.published_module_id,
    skillSet: row.skill_set === 'play' ? 'play' : 'authoring',
    agentSessionId: row.agent_session_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: ModuleDraftMessageRow): ModuleDraftMessageRecord {
  return {
    id: row.id,
    moduleDraftId: row.module_draft_id,
    role: row.role,
    content: row.content,
    meta: parseJson<Record<string, unknown>>(row.message_meta_json, {}),
    createdAt: row.created_at,
  };
}

export type CreateModuleDraftInput = {
  slug: string;
  title: string;
  summary?: string;
  setting?: string;
  difficulty?: string;
  ownerUserId: string;
  meta?: Record<string, unknown>;
  workspacePath: string;
};

export async function createModuleDraft(input: CreateModuleDraftInput): Promise<ModuleDraftRecord> {
  const { sqlite } = await getDatabase();
  const id = randomUUID();
  const timestamp = buildTimestamp();
  const data: Record<string, unknown> = {
    id: input.slug,
    title: input.title,
    summary: input.summary ?? '',
    setting: input.setting ?? '',
    difficulty: input.difficulty ?? '中等',
  };
  await sqlite.execute(
    `INSERT INTO module_drafts (
       id, slug, title, summary, setting, difficulty, owner_user_id, meta_json, data_json,
       workspace_path, status, skill_set, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.slug,
      input.title,
      input.summary ?? '',
      input.setting ?? '',
      input.difficulty ?? '中等',
      input.ownerUserId,
      JSON.stringify(input.meta ?? {}),
      JSON.stringify(data),
      input.workspacePath,
      'draft',
      'authoring',
      timestamp,
      timestamp,
    ],
  );
  const created = await getModuleDraftById(id);
  if (!created) {
    throw new Error('创建模组草稿失败');
  }
  return created;
}

export async function getModuleDraftById(id: string): Promise<ModuleDraftRecord | null> {
  const { sqlite } = await getDatabase();
  const result = await sqlite.execute<ModuleDraftRow>('SELECT * FROM module_drafts WHERE id = ?', [id]);
  const row = result.rows[0];
  return row ? mapDraft(row) : null;
}

export async function getModuleDraftBySlug(slug: string): Promise<ModuleDraftRecord | null> {
  const { sqlite } = await getDatabase();
  const result = await sqlite.execute<ModuleDraftRow>('SELECT * FROM module_drafts WHERE slug = ?', [slug]);
  const row = result.rows[0];
  return row ? mapDraft(row) : null;
}

export async function listModuleDraftsForOwner(ownerUserId: string): Promise<ModuleDraftRecord[]> {
  const { sqlite } = await getDatabase();
  const result = await sqlite.execute<ModuleDraftRow>(
    'SELECT * FROM module_drafts WHERE owner_user_id = ? ORDER BY updated_at DESC',
    [ownerUserId],
  );
  return result.rows.map(mapDraft);
}

export type UpdateModuleDraftMetaInput = {
  id: string;
  title?: string;
  summary?: string;
  setting?: string;
  difficulty?: string;
  meta?: Record<string, unknown>;
};

export async function updateModuleDraftMeta(input: UpdateModuleDraftMetaInput): Promise<ModuleDraftRecord | null> {
  const draft = await getModuleDraftById(input.id);
  if (!draft) {
    return null;
  }
  const next: ModuleDraftRecord = {
    ...draft,
    title: input.title ?? draft.title,
    summary: input.summary ?? draft.summary,
    setting: input.setting ?? draft.setting,
    difficulty: input.difficulty ?? draft.difficulty,
    meta: input.meta ?? draft.meta,
  };
  const { sqlite } = await getDatabase();
  const updatedAt = buildTimestamp();
  await sqlite.execute(
    `UPDATE module_drafts SET title = ?, summary = ?, setting = ?, difficulty = ?, meta_json = ?, updated_at = ?
     WHERE id = ?`,
    [next.title, next.summary, next.setting, next.difficulty, JSON.stringify(next.meta), updatedAt, input.id],
  );
  return getModuleDraftById(input.id);
}

export async function updateModuleDraftData(id: string, data: Record<string, unknown>): Promise<void> {
  const { sqlite } = await getDatabase();
  const updatedAt = buildTimestamp();
  await sqlite.execute('UPDATE module_drafts SET data_json = ?, updated_at = ? WHERE id = ?', [
    JSON.stringify(data),
    updatedAt,
    id,
  ]);
}

export async function setModuleDraftAgentSessionId(id: string, agentSessionId: string): Promise<void> {
  const { sqlite } = await getDatabase();
  const updatedAt = buildTimestamp();
  await sqlite.execute('UPDATE module_drafts SET agent_session_id = ?, updated_at = ? WHERE id = ?', [
    agentSessionId,
    updatedAt,
    id,
  ]);
}

export async function deleteModuleDraft(id: string): Promise<void> {
  const { sqlite } = await getDatabase();
  await sqlite.execute('DELETE FROM module_drafts WHERE id = ?', [id]);
}

export async function publishModuleDraft(input: {
  draft: ModuleDraftRecord;
}): Promise<{ moduleId: string; module: ModuleRecord }> {
  const { sqlite } = await getDatabase();
  const moduleId = input.draft.publishedModuleId ?? input.draft.slug;
  const timestamp = buildTimestamp();
  const data = input.draft.data as Record<string, unknown>;
  const dataJson = JSON.stringify({
    ...data,
    id: moduleId,
    title: input.draft.title,
    summary: input.draft.summary,
    setting: input.draft.setting,
    difficulty: input.draft.difficulty,
  });
  await sqlite.execute(
    `INSERT INTO modules (id, title, summary, setting, difficulty, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       summary = excluded.summary,
       setting = excluded.setting,
       difficulty = excluded.difficulty,
       data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
    [
      moduleId,
      input.draft.title,
      input.draft.summary,
      input.draft.setting,
      input.draft.difficulty,
      dataJson,
      timestamp,
      timestamp,
    ],
  );
  await sqlite.execute(
    `UPDATE module_drafts SET status = 'published', published_module_id = ?, updated_at = ?
     WHERE id = ?`,
    [moduleId, timestamp, input.draft.id],
  );
  const moduleRow = await sqlite.execute<{
    id: string;
    title: string;
    summary: string;
    setting: string;
    difficulty: string;
    data_json: string;
  }>('SELECT id, title, summary, setting, difficulty, data_json FROM modules WHERE id = ?', [moduleId]);
  const row = moduleRow.rows[0];
  if (!row) {
    throw new Error('发布模组失败');
  }
  return {
    moduleId,
    module: {
      id: row.id,
      title: row.title,
      summary: row.summary,
      setting: row.setting,
      difficulty: row.difficulty,
      data: parseJson<Record<string, unknown>>(row.data_json, {}),
    },
  };
}

export type CreateDraftMessageInput = {
  moduleDraftId: string;
  role: 'user' | 'assistant';
  content: string;
  meta?: Record<string, unknown>;
};

export async function createModuleDraftMessage(input: CreateDraftMessageInput): Promise<ModuleDraftMessageRecord> {
  const { sqlite } = await getDatabase();
  const id = randomUUID();
  const createdAt = buildTimestamp();
  await sqlite.execute(
    `INSERT INTO module_draft_messages (id, module_draft_id, role, content, message_meta_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.moduleDraftId, input.role, input.content, JSON.stringify(input.meta ?? {}), createdAt],
  );
  return {
    id,
    moduleDraftId: input.moduleDraftId,
    role: input.role,
    content: input.content,
    meta: input.meta ?? {},
    createdAt,
  };
}

export async function listModuleDraftMessages(moduleDraftId: string): Promise<ModuleDraftMessageRecord[]> {
  const { sqlite } = await getDatabase();
  const result = await sqlite.execute<ModuleDraftMessageRow>(
    'SELECT * FROM module_draft_messages WHERE module_draft_id = ? ORDER BY created_at ASC',
    [moduleDraftId],
  );
  return result.rows.map(mapMessage);
}
