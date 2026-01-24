ALTER TABLE scripts ADD COLUMN occupation_options_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE scripts ADD COLUMN origin_options_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE scripts ADD COLUMN buff_options_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE scripts ADD COLUMN debuff_options_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE scripts ADD COLUMN attribute_ranges_json TEXT NOT NULL DEFAULT '{}';

UPDATE scripts
SET occupation_options_json = '["神父","刑警","民俗学者","退伍军人","私家侦探","记者"]',
	origin_options_json = '["松柏镇","灰木镇","旧教堂区","码头区","郊外农场"]',
	buff_options_json = '["灵感加持","沉着冷静","仪式专注","团队支援","直觉敏锐"]',
	debuff_options_json = '["噩梦缠身","精神负荷","轻微受伤","恐惧残留","信念动摇"]',
	attribute_ranges_json = '{"strength":{"min":30,"max":85},"dexterity":{"min":30,"max":85},"constitution":{"min":30,"max":85},"size":{"min":20,"max":90},"intelligence":{"min":50,"max":90},"willpower":{"min":40,"max":95},"appearance":{"min":20,"max":85},"education":{"min":45,"max":90}}'
WHERE id = 'script-exorcism-door';
