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
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
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
	FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE RESTRICT
);

CREATE TABLE games (
	id TEXT PRIMARY KEY,
	script_id TEXT NOT NULL,
	character_id TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
	FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE RESTRICT,
	FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE RESTRICT
);

CREATE INDEX idx_games_script ON games(script_id);
CREATE INDEX idx_games_character ON games(character_id);
CREATE INDEX idx_characters_script ON characters(script_id);
