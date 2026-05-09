---
name: create_character
description: 基于当前剧本生成一张可落盘的人物卡，并返回校验结果。
scenarios: [authoring, play]
metadata:
  author: meathill
  version: "1.0.0"
  group: character
  execution-mode: native
---
# 创建人物卡
基于当前剧本生成一张可落盘的人物卡，并返回校验结果。
## When to use

- 开始 COC 小冒险前需要快速车卡时。
- AI 需要根据剧本约束生成一张结构化调查员卡时。
## Do not

- 只给出散文式角色设定，不真正生成结构化人物卡。
- 忽略剧本的职业、出身、装备或技能约束。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
