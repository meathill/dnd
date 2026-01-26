ALTER TABLE scripts ADD COLUMN rules_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE games ADD COLUMN rule_overrides_json TEXT NOT NULL DEFAULT '{"checkDcOverrides":{}}';
