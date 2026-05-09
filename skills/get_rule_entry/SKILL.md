---
name: get_rule_entry
description: 按 id 读取单个规则说明、技能条目、模板或怪物档案。
scenarios: [authoring, play]
metadata:
  author: meathill
  version: "1.0.0"
  group: rulebook
  execution-mode: native
---
# 读取规则书实体
按 id 读取单个规则说明、技能条目、模板或怪物档案。
## When to use

- 搜索到条目后需要读取完整结构化结果时。
- 游戏中需要解释标准规则、标准 NPC 或怪物能力时。
## Do not

- 不查档案就自由发挥关键规则实体。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
