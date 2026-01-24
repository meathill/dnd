ALTER TABLE scripts ADD COLUMN skill_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scripts ADD COLUMN equipment_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scripts ADD COLUMN buff_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE scripts ADD COLUMN debuff_limit INTEGER NOT NULL DEFAULT 0;

UPDATE scripts
SET skill_limit = 4,
	equipment_limit = 5,
	buff_limit = 1,
	debuff_limit = 1
WHERE id = 'script-exorcism-door';
