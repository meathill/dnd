export const INIT_SQL = `PRAGMA foreign_keys = ON;

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
  FOREIGN KEY (userId) REFERENCES "user"(id) ON DELETE CASCADE
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
  FOREIGN KEY (userId) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer)),
  updatedAt INTEGER NOT NULL DEFAULT (cast((julianday('now') - 2440587.5) * 86400000 as integer))
);

CREATE TABLE modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  setting TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  opencode_session_id TEXT NOT NULL,
  workspace_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE RESTRICT,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE RESTRICT
);

CREATE TABLE game_messages (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  message_meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE TABLE wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE billing_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL
);

CREATE INDEX idx_session_user ON session(userId);
CREATE INDEX idx_account_user ON account(userId);
CREATE INDEX idx_verification_identifier ON verification(identifier);
CREATE INDEX idx_characters_module ON characters(module_id);
CREATE INDEX idx_games_user ON games(user_id);
CREATE INDEX idx_games_module ON games(module_id);
CREATE INDEX idx_game_messages_game_created ON game_messages(game_id, created_at);
CREATE INDEX idx_billing_ledger_user_created ON billing_ledger(user_id, created_at);

INSERT INTO modules (id, title, summary, setting, difficulty, data_json)
VALUES (
  'script-exorcism-door',
  '破门驱邪',
  '郊外孤宅传来哭声，被邪灵附身的孩子被锁在地下室。',
  '1996 年郊外小镇 · 暴雨夜',
  '中等',
  json('{"id":"script-exorcism-door","title":"破门驱邪","summary":"郊外孤宅传来哭声，被邪灵附身的孩子被锁在地下室。","setting":"1996 年郊外小镇 · 暴雨夜","difficulty":"中等","openingMessages":[{"role":"system","content":"剧本《破门驱邪》开场。你们受旧教堂委托，前往格林家老宅调查孩童疑似被邪灵附身的传闻。"},{"role":"dm","speaker":"肉团长","content":"暴雨夜的松柏镇郊外，老宅在闪电里忽明忽暗。院子里散落着被撕裂的符纸，盐圈被雨水冲成断裂的弧线。"},{"role":"dm","speaker":"肉团长","content":"木门被木板钉死，门缝里透出微弱的烛光。地下室的哭声断断续续，你还能听见更深处的低语。"}],"background":{"overview":"格林家老宅被传出附身与驱魔失败的流言，旧教堂不愿让事态继续扩散。","truth":"真正的问题不是单纯附身，而是地下祈祷室中残留的失败仪式撕开了一个小型灵性裂口。","themes":["信仰失效","家庭崩塌","失控仪式"],"factions":["旧教堂","格林家残余亲属","暗中观察的邪教徒"],"locations":["格林家老宅","地下祈祷室","旧教堂"],"explorableAreas":[{"id":"area-yard","name":"老宅院子","summary":"暴雨冲刷的碎符与盐圈残迹。","description":"破旧围栏半塌，树影在闪电中摇晃，泥地上还能看见未被雨水洗净的符纸灰。","dmNotes":"提示符纸被撕裂是有人闯入时所为。"},{"id":"area-foyer","name":"正门与门廊","summary":"木门被木板钉死，烛光从门缝渗出。","description":"门廊上堆着旧箱子与断裂木板，门锁锈蚀但还算完整。","dmNotes":"破门或开锁均可进入，但会制造噪音。"}],"secrets":["符纸被撕裂并非邪灵自己所为，而是有人先一步闯入。","地下室的哭声会诱导调查员贸然深入。"]},"npcProfiles":[{"id":"npc-grace-neighbor","name":"格蕾丝太太","type":"受惊邻居","role":"neutral","threat":"低","summary":"住在老宅附近的寡妇，昨夜目睹了异常灯光和闯入者身影。","useWhen":"调查员在外围打听老宅消息时","status":"惊魂未定","hp":10,"attacks":[],"skills":[{"name":"心理学","value":35}],"traits":["不愿靠近老宅","记得一顶黑色雨帽"],"tactics":"只有在安抚后才愿意透露完整信息。","weakness":"容易被再次吓到而语无伦次。","sanityLoss":"0/0"}]}')
);

INSERT INTO characters (id, module_id, name, summary, data_json)
VALUES (
  'character-lin-wu',
  'script-exorcism-door',
  '林雾',
  '记者，偏调查与社交，长期追踪本地怪谈与失踪案。',
  json('{"id":"character-lin-wu","scriptId":"script-exorcism-door","name":"林雾","occupation":"记者","age":"29","origin":"松柏镇","appearance":"黑色风衣，手里总夹着速记本。","background":"长期追踪本地怪谈与失踪案。","motivation":"弄清老宅事件背后的真相。","avatar":"","luck":60,"attributes":{"strength":45,"dexterity":60,"constitution":50,"size":55,"intelligence":75,"willpower":65,"appearance":50,"education":70},"skills":{"spotHidden":65,"listen":55,"occult":35,"psychology":45,"persuade":50},"inventory":["手电筒","录音机","盐"],"buffs":["直觉敏锐"],"debuffs":[],"note":"习惯先记录痕迹，再与目击者交谈。"}')
);`;
