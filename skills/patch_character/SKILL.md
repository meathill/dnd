---
name: patch_character
description: 基于现有人物卡应用局部修改，并返回更新后的结构化结果与校验状态。
metadata:
  author: meathill
  version: "1.0.0"
  group: character
  execution-mode: native
---
# 修改人物卡
基于现有人物卡应用局部修改，并返回更新后的结构化结果与校验状态。
## When to use

- 需要调整人物卡的属性、技能、装备或背景字段时。
- AI 已有一张人物卡，需要在原卡基础上做小改动时。
## Do not

- 重新生成整张人物卡覆盖已有 id 和时间戳。
- 人物卡属于别的剧本时仍强行在当前剧本下修改。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
