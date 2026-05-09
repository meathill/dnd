import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDatabase } from './db';
import {
  createModuleDraft,
  createModuleDraftMessage,
  deleteModuleDraft,
  getModuleDraftById,
  listModuleDraftMessages,
  listModuleDraftsForOwner,
  publishModuleDraft,
  updateModuleDraftData,
  updateModuleDraftMeta,
} from './module-drafts-repo';

let databaseDir = '';

async function seedUser(userId: string): Promise<void> {
  const { sqlite } = await getDatabase();
  const timestamp = Date.now();
  await sqlite.execute('INSERT INTO "user" (id, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', [
    userId,
    `${userId}@example.com`,
    0,
    timestamp,
    timestamp,
  ]);
}

beforeEach(async () => {
  databaseDir = await mkdtemp(join(tmpdir(), 'dnd-module-drafts-'));
  process.env.DATABASE_URL = join(databaseDir, 'website.sqlite');
});

afterEach(async () => {
  Reflect.deleteProperty(process.env, 'DATABASE_URL');
  await rm(databaseDir, { recursive: true, force: true });
});

describe('module-drafts-repo', () => {
  it('creates / lists / updates a draft', async () => {
    await seedUser('owner-1');
    const draft = await createModuleDraft({
      slug: 'haunted-mansion',
      title: '荒宅夜话',
      summary: '废弃宅邸的雨夜',
      setting: '1990 雨夜',
      difficulty: '中等',
      ownerUserId: 'owner-1',
      meta: { ruleset: 'coc-7e-lite' },
      workspacePath: '/workspace/modules/drafts/haunted-mansion',
    });
    expect(draft.status).toBe('draft');
    expect(draft.skillSet).toBe('authoring');
    expect(draft.meta).toEqual({ ruleset: 'coc-7e-lite' });

    const fetched = await getModuleDraftById(draft.id);
    expect(fetched?.title).toBe('荒宅夜话');

    const drafts = await listModuleDraftsForOwner('owner-1');
    expect(drafts).toHaveLength(1);

    const updated = await updateModuleDraftMeta({
      id: draft.id,
      title: '荒宅夜话（修订）',
      difficulty: '困难',
    });
    expect(updated?.title).toBe('荒宅夜话（修订）');
    expect(updated?.difficulty).toBe('困难');

    await updateModuleDraftData(draft.id, { id: draft.slug, scenes: [{ id: 'scene-1' }] });
    const refreshed = await getModuleDraftById(draft.id);
    expect(refreshed?.data).toMatchObject({ scenes: [{ id: 'scene-1' }] });
  });

  it('records and lists draft messages', async () => {
    await seedUser('owner-1');
    const draft = await createModuleDraft({
      slug: 'haunted-mansion',
      title: '荒宅夜话',
      ownerUserId: 'owner-1',
      workspacePath: '/workspace/modules/drafts/haunted-mansion',
    });
    await createModuleDraftMessage({
      moduleDraftId: draft.id,
      role: 'user',
      content: '帮我先列出 Meta',
    });
    await createModuleDraftMessage({
      moduleDraftId: draft.id,
      role: 'assistant',
      content: '好的，调用 patch_basic',
      meta: { skill: 'patch_basic' },
    });

    const messages = await listModuleDraftMessages(draft.id);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('user');
    expect(messages[1]?.meta).toEqual({ skill: 'patch_basic' });
  });

  it('publishes a draft into modules table', async () => {
    await seedUser('owner-1');
    const draft = await createModuleDraft({
      slug: 'pub-test',
      title: '发布测试',
      summary: '...',
      setting: '...',
      difficulty: '中等',
      ownerUserId: 'owner-1',
      workspacePath: '/workspace/modules/drafts/pub-test',
    });
    await updateModuleDraftData(draft.id, {
      id: draft.slug,
      scenes: [{ id: 'scene-1', name: '老宅' }],
    });
    const refreshed = await getModuleDraftById(draft.id);
    if (!refreshed) {
      throw new Error('draft missing');
    }
    const result = await publishModuleDraft({ draft: refreshed });
    expect(result.moduleId).toBe('pub-test');
    expect(result.module.title).toBe('发布测试');

    const after = await getModuleDraftById(draft.id);
    expect(after?.status).toBe('published');
    expect(after?.publishedModuleId).toBe('pub-test');
  });

  it('deletes a draft', async () => {
    await seedUser('owner-1');
    const draft = await createModuleDraft({
      slug: 'del-1',
      title: '待删',
      ownerUserId: 'owner-1',
      workspacePath: '/workspace/modules/drafts/del-1',
    });
    await deleteModuleDraft(draft.id);
    expect(await getModuleDraftById(draft.id)).toBeNull();
  });
});
