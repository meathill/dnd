PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user_settings (
	user_id TEXT PRIMARY KEY,
	ai_provider TEXT NOT NULL,
	ai_model TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
