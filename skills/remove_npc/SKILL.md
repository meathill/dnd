---
name: remove_npc
description: 删除指定 id 的 NPC，只返回结构化删除建议。
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: native
---
# 删除 NPC
删除指定 id 的 NPC，只返回结构化删除建议。
## When to use

- 用户明确要求移除某个 NPC 时。
## Do not

- 不明确目标 id 时误删 NPC。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
