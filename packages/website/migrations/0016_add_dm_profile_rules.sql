PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS dm_profile_rules (
  id TEXT PRIMARY KEY,
  dm_profile_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_num INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (dm_profile_id) REFERENCES dm_profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dm_profile_rules_profile_id ON dm_profile_rules (dm_profile_id);

INSERT INTO dm_profile_rules (
  id,
  dm_profile_id,
  phase,
  category,
  title,
  content,
  order_num,
  is_enabled
) VALUES
  (
    'dm-default-rule-1',
    'dm-default',
    'analysis',
    '越界与越狱',
    '超出剧本/时代/权限',
    '说明不可执行的原因，给出可行替代方案或拆分为可执行动作后再继续。',
    10,
    1
  ),
  (
    'dm-default-rule-2',
    'dm-default',
    'analysis',
    '动作拆分',
    '跳过检定的长动作',
    '将玩家输入拆解为多步检定，必要时先执行第一步并等待后续行动，不接受直接跳过掷骰的结果描述。',
    20,
    1
  ),
  (
    'dm-default-rule-3',
    'dm-default',
    'analysis',
    '难度控制',
    '默认不过度苛刻',
    '优先普通或困难，极难必须有充分理由；避免连续失败导致停滞。',
    30,
    1
  ),
  (
    'dm-default-rule-4',
    'dm-default',
    'narration',
    '失败处理',
    '失败也要推进剧情',
    '失败给出线索、代价或新的切入点，避免剧情卡死。',
    10,
    1
  ),
  (
    'dm-default-rule-5',
    'dm-default',
    'narration',
    '节奏与压迫',
    '维持恐惧但避免团灭',
    '保持克苏鲁氛围，但不要无预警团灭或一击毙命，留出选择空间。',
    20,
    1
  ),
  (
    'dm-default-rule-6',
    'dm-default',
    'narration',
    '信息回馈',
    '玩家描述过长时',
    '叙事中明确实际发生的部分，并提示剩余动作需要检定或下一轮行动。',
    30,
    1
  )
ON CONFLICT(id) DO NOTHING;
