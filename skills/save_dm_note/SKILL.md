---
name: save_dm_note
description: 把游戏中产生的线索、道具、状态变化写入 DM 笔记，供后续查询。
scenarios: [play]
metadata:
  author: meathill
  version: "1.0.0"
  group: record
  execution-mode: native
---
# 保存 DM 笔记

把游戏过程中产生的线索、获得的道具、NPC 状态变化、时间线进展
写入工作区 `data/sessions/<session-id>/dm-notes.md`，供日后查询与续档。

## When to use

- 玩家获得新线索（clue）时。
- 玩家获得或失去道具（prop）时。
- NPC 态度发生明显变化（好感+/-、已说服、已对抗）时。
- 时间线发生推进（到达新地点、触发事件）时。
- 检定产生重要后果时（大成功/大失败）。

## Do not

- 只在对话里描述而不落盘。
- 重复写入未发生变化的信息。
- 把隐藏真相（hidden_truth）写入玩家可见区域。

## File Structure

笔记文件路径：`data/sessions/<session-id>/dm-notes.md`

`session-id` 格式：`<module-id>-<YYYYMMDD>`，例：`zhumadian-exorcist-20260503`

文件为 Markdown，frontmatter 记录元数据，正文按分节追加：

```markdown
---
module: zhumadian-exorcist
session: zhumadian-exorcist-20260503
investigator: wang-fugui
started_at: "2026-05-03T22:00:00+08:00"
in_game_time: "14:00"
---

## 📋 已获得线索

| id | 内容摘要 | 获取方式 | 场景 |
|----|----------|----------|------|
| clue-01 | 张建国：今晚仪式，可一起去 | 必经叙事 | S01 |
| clue-02 | 获得手绘地图 | 必经叙事 | S01 |

## 🎒 当前道具

| id | 道具名 | 来源 | 状态 |
|----|--------|------|------|
| prop-01 | 手绘地图 | 张建国 | 持有 |
| eq-torch | 手电筒 | 初始装备 | 持有 |

## 👥 NPC 状态

| NPC | 初始态度 | 当前态度 | 变化原因 |
|-----|----------|----------|----------|
| 张建国 | 客气·半信半疑 | 信任 | 王富贵老相识 |

## ⏰ 时间线进展

| 游戏内时间 | 事件 |
|-----------|------|
| 14:00 | 到达派出所，完成开场 |

## 🎲 重要检定记录

| 场景 | 技能 | 结果 | 效果 |
|------|------|------|------|
```

## Append Procedure

每次触发本 skill 时：
1. 用 `view_file` 读取现有笔记文件（若不存在则创建）。
2. 仅在对应分节末尾追加新内容，不重写全文。
3. 更新 frontmatter 中的 `in_game_time`。
4. 用 `write_to_file`（Overwrite=true）写回完整文件。

## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。

## Usage
1. 判断触发条件（线索/道具/NPC状态/时间线/检定）是否满足。
2. 读取现有笔记，定位要追加的分节。
3. 拼装新行，追加写入。
4. 向 GM 叙事流程返回"已记录"确认，不中断游戏节奏。
