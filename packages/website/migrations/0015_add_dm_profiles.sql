CREATE TABLE IF NOT EXISTS dm_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  analysis_guide TEXT NOT NULL,
  narration_guide TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

ALTER TABLE user_settings ADD COLUMN dm_profile_id TEXT;

INSERT INTO dm_profiles (
  id,
  name,
  summary,
  analysis_guide,
  narration_guide,
  is_default
) VALUES (
  'dm-default',
  '温和推进',
  '偏向剧情推进，减少卡关与硬失败。',
  '验证偏好：\n1) 以“允许并推进”为默认；除非明显越权/越狱/跨时代/与剧本核心冲突，否则 allowed=true。\n2) 不要因为“角色能力不足”直接拒绝，改用更高难度或附带代价。\n3) 不确定时选择普通或困难，不要频繁给极难。\n4) 可将玩家输入拆分为可执行动作，必要时补充合理前置动作。',
  '叙事风格：\n1) 对 PC 友好，失败也给线索/代价/替代路径，避免卡关。\n2) 维持克苏鲁压迫感，但避免无预警的团灭。\n3) 推动剧情优先，节奏紧凑，重点突出。\n4) 若连续失败，主动给出新的可行动线索或窗口。',
  1
)
ON CONFLICT(id) DO NOTHING;
