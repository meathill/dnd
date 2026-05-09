---
name: save_local_character
description: 把结构化人物卡写入工作区 `data/characters`。
scenarios: [authoring, play]
metadata:
  author: meathill
  version: "1.1.0"
  group: record
  execution-mode: native
---
# 保存人物卡到本地文件
把结构化人物卡写入工作区 `data/characters`。
## When to use

- 玩家角色创建完成后需要落盘时。
- AI 生成或更新人物卡后需要写入工作区文件时。
- **关键 NPC 创建完成后**：关键 NPC（全程出现、有谈判树/战斗属性/触发脚本的 NPC）也应用此 skill 保存独立卡牌，文件名建议以 `npc-` 为前缀（如 `npc-zhang-jianguo.json`）。

## Do not

- 只在上下文里临时持有角色，不做持久化。
- 保存关键 NPC 卡牌后忘记调用 `patch_npc` 在模组中添加 `card_ref` 关联。

## 保存后续步骤

| 角色类型 | 保存后必做 |
|---------|----------|
| 玩家角色 | 无需额外步骤 |
| 关键 NPC | 调用 `patch_npc` 在模组 `npcs[id]` 中添加 `type: "key_npc"` 和 `card_ref` |

## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
