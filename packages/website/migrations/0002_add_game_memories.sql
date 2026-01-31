PRAGMA foreign_keys = ON;

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
