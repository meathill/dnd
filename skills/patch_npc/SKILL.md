---
name: patch_npc
description: 新增或更新一个 NPC，只返回结构化 patch 建议。
metadata:
  author: meathill
  version: "1.1.0"
  group: module
  execution-mode: native
---
# 新增或修改 NPC
新增或更新一个 NPC，只返回结构化 patch 建议。
## When to use

- 用户要求补充、修改关键 NPC 时。
- 需要把 NPC 设定整理为结构化档案时。
- **用 `save_local_character` 保存了关键 NPC 独立卡牌后，必须紧接着调用此 skill**，在模组的 `npcs` 数组中对应条目添加 `type: "key_npc"` 和 `card_ref: "data/characters/<file>.json"`，保持模组与独立卡牌同步。

## Do not

- 更新现有 NPC 时编造不存在的 id。
- 保存了独立 NPC 卡牌后跳过此步骤——模组 NPC 条目与独立卡牌文件必须保持双向关联。

## 关键 NPC vs 临时 NPC

| 类型 | 判断标准 | 处理方式 |
|------|---------|----------|
| 关键 NPC | 全程出现、有谈判树/战斗属性/触发脚本 | `save_local_character` 保存独立卡牌，然后 `patch_npc` 添加 `card_ref` |
| 临时 NPC | 单场景路人、信息提供者 | `create_temp_npc` 即时生成，无需持久化 |

## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
