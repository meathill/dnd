ALTER TABLE scripts ADD COLUMN attribute_point_budget INTEGER NOT NULL DEFAULT 0;

UPDATE scripts
SET attribute_point_budget = 460
WHERE id = 'script-exorcism-door';
