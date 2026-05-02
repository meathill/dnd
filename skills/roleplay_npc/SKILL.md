---
name: roleplay_npc
description: 在扮演关键 NPC 前先读取模组中的预设档案。
metadata:
  author: meathill
  version: "1.0.0"
  group: gameplay
  execution-mode: native
---
# 读取关键 NPC 档案
在扮演关键 NPC 前先读取模组中的预设档案。
## When to use

- 需要让关键 NPC 开口说话时。
- 需要引用关键 NPC 的立场、能力、秘密或战术时。
## Do not

- 不查档案就自由发挥关键 NPC。
- 给 NPC 添加模组中不存在的重要设定。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
