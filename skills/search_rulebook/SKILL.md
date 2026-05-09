---
name: search_rulebook
description: 搜索 COC 最小规则库中的技能、模板、怪物和规则条目。
scenarios: [authoring, play]
metadata:
  author: meathill
  version: "1.0.0"
  group: rulebook
  execution-mode: native
---
# 搜索规则书实体
搜索 COC 最小规则库中的技能、模板、怪物和规则条目。
## When to use

- 需要标准技能、职业、怪物或 NPC 模板时。
- 模组制作中需要确认标准条目而不是自己硬编时。
## Do not

- 规则书已经有标准实体时，重新编造一套不一致的数据。
- 导入商业规则书全文。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
