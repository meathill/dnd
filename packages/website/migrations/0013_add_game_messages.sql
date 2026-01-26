PRAGMA foreign_keys = ON;

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
