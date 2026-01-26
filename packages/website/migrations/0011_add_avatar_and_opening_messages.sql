ALTER TABLE scripts ADD COLUMN opening_messages_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE characters ADD COLUMN avatar TEXT NOT NULL DEFAULT '';

UPDATE scripts
SET opening_messages_json = '[
  {"role":"system","content":"剧本《破门驱邪》开场。你们受旧教堂委托，前往格林家老宅调查孩童疑似被邪灵附身的传闻。"},
  {"role":"dm","speaker":"肉团长","content":"暴雨夜的松柏镇郊外，老宅在闪电里忽明忽暗。院子里散落着被撕裂的符纸，盐圈被雨水冲成断裂的弧线。"},
  {"role":"dm","speaker":"肉团长","content":"木门被木板钉死，门缝里透出微弱的烛光。地下室的哭声断断续续，你还能听见更深处的低语。"}
]'
WHERE id = 'script-exorcism-door';
