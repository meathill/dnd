---
name: patch_background
description: 修改模组背景章节，包括总览、核心真相、主题、势力、地点和隐藏要点。
scenarios: [authoring]
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: native
---
# 修改模组背景
修改模组背景章节，包括总览、核心真相、主题、势力、地点和隐藏要点。
## When to use

- 用户要求补背景、核心真相、主题或隐藏信息时。
- 需要把世界观信息整理成结构化背景时。
## Do not

- 把未确认的候选设定直接当成既定事实。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
