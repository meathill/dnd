PRAGMA foreign_keys = ON;

-- 阶段 1：用户角色（admin 由环境变量决定，不入库；editor 入库）
ALTER TABLE "user" ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- 阶段 5：模组草稿（创作中的模组）
CREATE TABLE IF NOT EXISTS module_drafts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  setting TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT '中等',
  owner_user_id TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  data_json TEXT NOT NULL DEFAULT '{}',
  workspace_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_module_id TEXT,
  skill_set TEXT NOT NULL DEFAULT 'authoring',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (owner_user_id) REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY (published_module_id) REFERENCES modules(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS module_draft_messages (
  id TEXT PRIMARY KEY,
  module_draft_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (module_draft_id) REFERENCES module_drafts(id) ON DELETE CASCADE
);

-- 阶段 3：会话级别 skill set
ALTER TABLE games ADD COLUMN skill_set TEXT NOT NULL DEFAULT 'play';

CREATE INDEX IF NOT EXISTS idx_module_drafts_owner ON module_drafts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_module_draft_messages_draft_created
  ON module_draft_messages(module_draft_id, created_at);
