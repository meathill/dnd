---
name: get_creature_profile
description: 读取规则书中的怪物或超自然威胁模板。
metadata:
  author: meathill
  version: "1.0.0"
  group: rulebook
  execution-mode: native
---
# 读取怪物模板
读取规则书中的怪物或超自然威胁模板。
## When to use

- 需要怪物/威胁模板时。
- 评估超自然场景的战斗和理智压力时。
## Do not

- 不查档案就自由发挥关键规则实体。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
