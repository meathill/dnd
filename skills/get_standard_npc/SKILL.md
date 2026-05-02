---
name: get_standard_npc
description: 读取规则书中的标准 NPC 模板。
metadata:
  author: meathill
  version: "1.0.0"
  group: rulebook
  execution-mode: native
---
# 读取标准 NPC 模板
读取规则书中的标准 NPC 模板。
## When to use

- 需要标准 NPC 模板时。
- 模组中需要快速引用新手友好的标准人类对手或证人模板时。
## Do not

- 不查档案就自由发挥关键规则实体。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
