PRAGMA foreign_keys = ON;

ALTER TABLE characters ADD COLUMN user_id TEXT REFERENCES user(id);
ALTER TABLE games ADD COLUMN user_id TEXT REFERENCES user(id);

CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_games_user ON games(user_id);
CREATE UNIQUE INDEX idx_games_character_unique ON games(character_id);
