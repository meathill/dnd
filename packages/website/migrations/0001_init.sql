PRAGMA foreign_keys = ON;

CREATE TABLE scripts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  setting TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  skill_options_json TEXT NOT NULL,
  equipment_options_json TEXT NOT NULL,
  scenes_json TEXT NOT NULL,
  encounters_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  occupation_options_json TEXT NOT NULL DEFAULT '[]',
  origin_options_json TEXT NOT NULL DEFAULT '[]',
  buff_options_json TEXT NOT NULL DEFAULT '[]',
  debuff_options_json TEXT NOT NULL DEFAULT '[]',
  attribute_ranges_json TEXT NOT NULL DEFAULT '{}',
  skill_limit INTEGER NOT NULL DEFAULT 0,
  equipment_limit INTEGER NOT NULL DEFAULT 0,
  buff_limit INTEGER NOT NULL DEFAULT 0,
  debuff_limit INTEGER NOT NULL DEFAULT 0,
  attribute_point_budget INTEGER NOT NULL DEFAULT 0,
  opening_messages_json TEXT NOT NULL DEFAULT '[]',
  background_json TEXT NOT NULL DEFAULT '{}',
  story_arcs_json TEXT NOT NULL DEFAULT '[]',
  enemy_profiles_json TEXT NOT NULL DEFAULT '[]',
  rules_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  name TEXT NOT NULL,
  occupation TEXT NOT NULL,
  age TEXT NOT NULL,
  origin TEXT NOT NULL,
  appearance TEXT NOT NULL,
  background TEXT NOT NULL,
  motivation TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  skills_json TEXT NOT NULL,
  inventory_json TEXT NOT NULL,
  buffs_json TEXT NOT NULL,
  debuffs_json TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_id TEXT REFERENCES user(id),
  avatar TEXT NOT NULL DEFAULT '',
  luck INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE RESTRICT
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  user_id TEXT REFERENCES user(id),
  rule_overrides_json TEXT NOT NULL DEFAULT '{"checkDcOverrides":{}}',
  FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE RESTRICT,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE RESTRICT
);

CREATE INDEX idx_games_script ON games(script_id);
CREATE INDEX idx_games_character ON games(character_id);
CREATE INDEX idx_characters_script ON characters(script_id);

CREATE TABLE game_memories (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE,
  last_round_index INTEGER NOT NULL DEFAULT 0,
  last_processed_at TEXT NOT NULL DEFAULT '',
  short_summary TEXT NOT NULL DEFAULT '',
  long_summary TEXT NOT NULL DEFAULT '',
  recent_rounds_json TEXT NOT NULL DEFAULT '[]',
  state_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_memories_game ON game_memories(game_id);

CREATE TABLE game_memory_maps (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  round_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_memory_maps_game ON game_memory_maps(game_id, created_at);

CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY,
  ai_provider TEXT NOT NULL,
  ai_fast_model TEXT NOT NULL DEFAULT '',
  ai_general_model TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  dm_profile_id TEXT
);

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  expiresAt INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  scope TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  password TEXT,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);

CREATE INDEX idx_session_user ON session(userId);
CREATE INDEX idx_account_user ON account(userId);
CREATE INDEX idx_verification_identifier ON verification(identifier);

CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_games_user ON games(user_id);
CREATE UNIQUE INDEX idx_games_character_unique ON games(character_id);

CREATE TABLE game_messages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL,
  speaker TEXT NOT NULL,
  content TEXT NOT NULL,
  modules_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_messages_game ON game_messages(game_id);
CREATE INDEX idx_game_messages_game_created ON game_messages(game_id, created_at);

CREATE TABLE dm_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  analysis_guide TEXT NOT NULL,
  narration_guide TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE dm_profile_rules (
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

CREATE INDEX idx_dm_profile_rules_profile_id ON dm_profile_rules (dm_profile_id);

CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT INTO scripts (
  id,
  title,
  summary,
  setting,
  difficulty,
  skill_options_json,
  equipment_options_json,
  scenes_json,
  encounters_json,
  occupation_options_json,
  origin_options_json,
  buff_options_json,
  debuff_options_json,
  attribute_ranges_json,
  skill_limit,
  equipment_limit,
  buff_limit,
  debuff_limit,
  attribute_point_budget,
  opening_messages_json,
  background_json,
  story_arcs_json,
  enemy_profiles_json,
  rules_json
) VALUES (
  'script-exorcism-door',
  '破门驱邪',
  '郊外孤宅传来哭声，被邪灵附身的孩子被锁在地下室。',
  '1996 年郊外小镇 · 暴雨夜',
  '中等',
  '[
    {"id":"spotHidden","label":"侦查","group":"调查"},
    {"id":"listen","label":"聆听","group":"调查"},
    {"id":"occult","label":"神秘学","group":"学识"},
    {"id":"psychology","label":"心理学","group":"学识"},
    {"id":"medicine","label":"医学","group":"学识"},
    {"id":"firstAid","label":"急救","group":"学识"},
    {"id":"persuade","label":"说服","group":"社交"},
    {"id":"intimidate","label":"威吓","group":"社交"},
    {"id":"stealth","label":"潜行","group":"行动"},
    {"id":"locksmith","label":"开锁","group":"行动"},
    {"id":"brawl","label":"格斗","group":"战斗"},
    {"id":"firearms","label":"枪械","group":"战斗"}
  ]',
  '["圣水","银质十字","驱魔符纸","手电筒","撬棍","绳索","急救包","散弹枪","左轮手枪","盐","蜡烛","录音机"]',
  '[
    {"id":"scene-mansion","title":"封锁的老宅","summary":"破门闯入，屋内尽是撕裂的护符与混乱痕迹。","location":"格林家的老宅","hooks":["符纸残片","烧毁的圣像","孩童哭声"]},
    {"id":"scene-basement","title":"地下祈祷室","summary":"盐圈与刻痕围出祭坛，驱魔仪式在此达成。","location":"地下室祈祷间","hooks":["盐圈","刻痕","破碎祭坛"]}
  ]',
  '[
    {"id":"encounter-cult","title":"邪教徒阻击","summary":"护法信徒阻挡外来者进入地下室。","enemies":["邪教徒 x3"],"danger":"中"},
    {"id":"encounter-possessed","title":"邪灵显形","summary":"附身孩童失控，邪灵在仪式中现形。","enemies":["被附身的孩童 x1","影灵 x1"],"danger":"高"}
  ]',
  '["神父","刑警","民俗学者","退伍军人","私家侦探","记者"]',
  '["松柏镇","灰木镇","旧教堂区","码头区","郊外农场"]',
  '["灵感加持","沉着冷静","仪式专注","团队支援","直觉敏锐"]',
  '[]',
  '{}',
  4,
  5,
  1,
  0,
  0,
  '[
    {"role":"system","content":"剧本《破门驱邪》开场。你们受旧教堂委托，前往格林家老宅调查孩童疑似被邪灵附身的传闻。"},
    {"role":"dm","speaker":"肉团长","content":"暴雨夜的松柏镇郊外，老宅在闪电里忽明忽暗。院子里散落着被撕裂的符纸，盐圈被雨水冲成断裂的弧线。"},
    {"role":"dm","speaker":"肉团长","content":"木门被木板钉死，门缝里透出微弱的烛光。地下室的哭声断断续续，你还能听见更深处的低语。"}
  ]',
  '{"overview":"","truth":"","themes":[],"factions":[],"locations":[],"secrets":[]}',
  '[]',
  '[]',
  '{}'
)
ON CONFLICT(id) DO NOTHING;

INSERT INTO scripts (
  id,
  title,
  summary,
  setting,
  difficulty,
  skill_options_json,
  equipment_options_json,
  scenes_json,
  encounters_json,
  occupation_options_json,
  origin_options_json,
  buff_options_json,
  debuff_options_json,
  attribute_ranges_json,
  skill_limit,
  equipment_limit,
  buff_limit,
  debuff_limit,
  attribute_point_budget,
  opening_messages_json,
  background_json,
  story_arcs_json,
  enemy_profiles_json,
  rules_json
) VALUES (
  'script-fengshui-studio',
  '竹影装潢',
  '刚毕业的你进入装修工作室，随二师姐处理第一单凶宅委托。',
  '2026 年沿江城 · 初冬细雨',
  '中低',
  '[
    {"id":"spotHidden","label":"侦查","group":"调查"},
    {"id":"listen","label":"聆听","group":"调查"},
    {"id":"occult","label":"神秘学","group":"学识"},
    {"id":"psychology","label":"心理学","group":"学识"},
    {"id":"libraryUse","label":"图书馆使用","group":"学识"},
    {"id":"persuade","label":"说服","group":"社交"},
    {"id":"stealth","label":"潜行","group":"行动"},
    {"id":"locksmith","label":"开锁","group":"行动"},
    {"id":"firstAid","label":"急救","group":"学识"},
    {"id":"brawl","label":"格斗","group":"战斗"},
    {"id":"electricalRepair","label":"电器维修","group":"行动"}
  ]',
  '["手电筒","测距仪","工具箱","罗盘","驱邪符纸","盐","录音笔","手套","口罩","红绳","小锤","胶带"]',
  '[
    {"id":"scene-studio","title":"竹影装潢工作室","summary":"雨夜里堆满工具的工作室是你入门的第一站。","location":"沿江城·老仓库改造区","hooks":["艾草味","罗盘","施工合同"]},
    {"id":"scene-apartment","title":"青藤巷 17 号","summary":"旧楼凶宅被重新上锁，屋内潮湿阴冷。","location":"青藤巷 17 号","hooks":["残破封条","新换门锁","邻居低语"]},
    {"id":"scene-crawlspace","title":"墙体暗格","summary":"梁柱中藏着破损阵眼与旧符纸，怨念源头在此。","location":"次卧墙体夹层","hooks":["断裂铜钱线","潮湿符纸","压抑冷气"]}
  ]',
  '[
    {"id":"encounter-tools","title":"附灵工具骚动","summary":"施工工具无故启动，带着尖锐噪音逼退来访者。","enemies":["附灵电钻 x1","失控卷尺 x1"],"danger":"低"},
    {"id":"encounter-spirit","title":"怨念显形","summary":"怨念自阵眼涌出，逼迫众人离开。","enemies":["残留怨灵 x1"],"danger":"中"}
  ]',
  '["室内设计助理","建筑学毕业生","工程监理实习生","民俗学爱好者","新媒体编辑"]',
  '["沿江城","旧港区","大学城","城北新区","南岸老街"]',
  '["细心观察","冷静自持","动手能力","临场判断"]',
  '[]',
  '{}',
  4,
  5,
  1,
  0,
  0,
  '[
    {"role":"system","content":"剧本《竹影装潢》开场。你刚毕业入职装修工作室，跟随二师姐林砚前往处理凶宅委托。"},
    {"role":"dm","speaker":"肉团长","content":"工作室里堆满卷尺、罗盘与符纸，空气里有淡淡的艾草味。林砚递给你工具箱，提醒你别乱碰阵眼。"},
    {"role":"dm","speaker":"肉团长","content":"车停在青藤巷 17 号。旧楼外墙被雨水冲得斑驳，封条残破，门锁却崭新。"}
  ]',
  '{"overview":"竹影装潢是一家装修工作室，实际由风水师接手凶宅驱邪后转手出售。","truth":"本次凶宅的“闹鬼”源自前租户意外死亡留下的怨念与阵眼破损。","themes":["职场试炼","民俗与科学","隐秘交易"],"factions":["竹影装潢","物业与房东","附近居民"],"locations":["竹影装潢工作室","青藤巷 17 号","邻里便利店"],"secrets":["师父并未全盘告知你本次交易的真实利润","林砚其实在测试你是否能承受灵异冲击","阵眼被人为破坏，可能有人想赶走灵异以压价收房"]}',
  '[
    {"id":"arc-entry","title":"入门试炼","summary":"随二师姐上门，完成现场勘察与规矩建立。","beats":["准备工具与规矩","进入现场","发现第一处异常"],"reveals":["工作室真实业务","凶宅基本信息"]},
    {"id":"arc-clues","title":"线索回收","summary":"调查邻里与屋内迹象，找到怨念来源。","beats":["询问邻居","检视墙体与符纸","定位阵眼"],"reveals":["前租户事故真相","阵眼破损原因"]},
    {"id":"arc-ritual","title":"驱邪收束","summary":"修复阵眼或完成仪式，决定凶宅去留。","beats":["布置盐圈","完成安宅仪式","处理善后"],"reveals":["竹影装潢的交易链条","你是否继续留下"]}
  ]',
  '[
    {"id":"enemy-restless-spirit","name":"残留怨灵","type":"灵体","threat":"中","summary":"由意外死亡的租户残念凝成，依附于破损阵眼。","hp":10,"armor":1,"move":8,"attacks":[{"name":"寒意侵袭","chance":35,"damage":"1D4 失温","effect":"失败则下一轮动作减半"}],"skills":[{"name":"恐吓","value":50}],"traits":["穿墙","畏火与符"],"tactics":"先制造寒意与噪响驱散调查者，再靠近阵眼反扑。","weakness":"明火、完整符纸与盐圈","sanityLoss":"0/1D4"},
    {"id":"enemy-possessed-tools","name":"附灵工具","type":"怪异","threat":"低","summary":"被怨念扰动的施工工具，会突然启动攻击。","hp":6,"armor":0,"move":6,"attacks":[{"name":"飞旋切割","chance":30,"damage":"1D4"}],"skills":[{"name":"敏捷闪避","value":40}],"traits":["噪音惊吓","易受断电影响"],"tactics":"用突发噪音逼退调查者，造成轻伤。","weakness":"断电或拉闸","sanityLoss":"0/1"}
  ]',
  '{}'
)
ON CONFLICT(id) DO NOTHING;

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
  '目标：让玩家玩得开心，保持开放但不过度越权，遵循规则优先级（房规 > 规则书 > 情境裁定）。
判定总则：
1) 以“允许并推进”为默认；除非明显越权/越狱/跨时代/与剧本核心冲突，否则 allowed=true。
2) 玩家描述的结果只代表意图，必须拆分为可执行动作 + 检定。
3) 不要因为“角色能力不足”直接拒绝，改用更高难度或附带代价。
4) 不确定时选择普通，有必要再给困难，只有极少数地方用到极难。
5) 需要前置条件时先补前置或分步行动。
6) 禁止自行掷骰或计算成功/失败，只给出参数交由函数处理。
记忆与一致性：
7) 新增事实需保持一致，并在叙事中明确以便进入记录。',
  '叙事风格：
1) 每轮给出“发生了什么 + 环境变化”，节奏紧凑。
2) 失败也要推进：给线索、代价或替代路径，避免卡关。
3) 对越权/越狱用世界内反馈化解，不与玩家争论系统规则。
4) 新生成内容要具体可互动，方便后续引用。
5) 维持克苏鲁压迫感，但避免无预警的团灭。',
  1
)
ON CONFLICT(id) DO NOTHING;

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
    '将玩家输入拆解为多步检定，玩家即便描述结果也视为意图，不接受直接跳过掷骰的结果描述。',
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
  ),
  (
    'dm-default-rule-7',
    'dm-default',
    'analysis',
    '记忆与一致性',
    '前情核对',
    '优先使用已有事实；遇到空白先补前置动作或合理假设，并在叙事中明确为后续记录。',
    40,
    1
  ),
  (
    'dm-default-rule-8',
    'dm-default',
    'analysis',
    '即兴扩展',
    '场景与NPC补全',
    '补全细节必须符合时代/地点/角色逻辑，提供可互动要点与动机，避免与剧本冲突。',
    50,
    1
  ),
  (
    'dm-default-rule-9',
    'dm-default',
    'analysis',
    '挑战设计',
    '障碍与检定',
    '当玩家跨越障碍时设计 DC 与替代路线，优先给出成本、风险或分段检定。',
    60,
    1
  ),
  (
    'dm-default-rule-10',
    'dm-default',
    'analysis',
    '多人互动',
    '尊重他人角色',
    '涉及其他 PC 时保持对方自主，避免替玩家决定他人行动或结果。',
    70,
    1
  ),
  (
    'dm-default-rule-11',
    'dm-default',
    'narration',
    '结果与线索',
    '每轮输出结构',
    '先描述行动结果与环境变化，再给可继续推进的线索或选项。',
    40,
    1
  ),
  (
    'dm-default-rule-12',
    'dm-default',
    'narration',
    '越权反馈',
    '世界内拒绝',
    '对越权/越狱用世界内逻辑反馈失败原因并给替代路径，不用系统口吻争论。',
    50,
    1
  ),
  (
    'dm-default-rule-13',
    'dm-default',
    'narration',
    '新事实落地',
    '命名与标记',
    '新增 NPC/地点/物件要给名称与关键特征，确保后续可引用。',
    60,
    1
  ),
  (
    'dm-default-rule-14',
    'dm-default',
    'narration',
    '张力控制',
    '恐惧但不绝望',
    '保持不安与未知，但避免连续无解与无预警团灭。',
    70,
    1
  ),
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
