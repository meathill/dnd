PRAGMA foreign_keys = ON;

-- 模组草稿与 VPS 上 agent-server 的 session 关联
ALTER TABLE module_drafts ADD COLUMN agent_session_id TEXT;
CREATE INDEX IF NOT EXISTS idx_module_drafts_agent_session ON module_drafts(agent_session_id);
