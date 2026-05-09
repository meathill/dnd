---
name: create_temp_npc
description: 为现场交互需要的临时 NPC 生成即时人物卡。
scenarios: [play]
metadata:
  author: meathill
  version: "1.0.0"
  group: gameplay
  execution-mode: native
---
# 创建临时 NPC
为现场交互需要的临时 NPC 生成即时人物卡。
## When to use

- 玩家与未预设的酒保、路人、门卫、店员、目击者等交互时。
## Do not

- 对关键 NPC 使用这个 skill 替代正式档案。
- 同一个临时 NPC 反复重建导致设定漂移。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
