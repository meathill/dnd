PRAGMA foreign_keys = ON;

CREATE TABLE game_memory_maps (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL,
  round_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX idx_game_memory_maps_game ON game_memory_maps(game_id, created_at);
