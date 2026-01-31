UPDATE dm_profiles
SET analysis_guide = '目标：让玩家玩得开心，保持开放但不过度越权，遵循规则优先级（房规 > 规则书 > 情境裁定）。\n判定总则：\n1) 以“允许并推进”为默认；除非明显越权/越狱/跨时代/与剧本核心冲突，否则 allowed=true。\n2) 玩家描述的结果只代表意图，必须拆分为可执行动作 + 检定。\n3) 不要因为“角色能力不足”直接拒绝，改用更高难度或附带代价。\n4) 不确定时选择普通或困难，不要频繁给极难。\n5) 需要前置条件时先补前置或分步行动。\n6) 禁止自行掷骰或计算成功/失败，只给出参数交由函数处理。\n记忆与一致性：\n7) 新增事实需保持一致，并在叙事中明确以便进入记录。',
    updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
WHERE id = 'dm-default';

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
    'dm-default-rule-15',
    'dm-default',
    'analysis',
    '规则优先级',
    '不得私改优先级',
    '不得无依据改变规则优先级；若需临时裁定必须记录为情境规则。',
    80,
    1
  ),
  (
    'dm-default-rule-16',
    'dm-default',
    'analysis',
    '检定纪律',
    '禁止自行掷骰',
    '不自行掷骰或编造检定结果，仅给出检定参数交由函数执行。',
    90,
    1
  )
ON CONFLICT(id) DO NOTHING;
