---
name: patch_basic
description: 修改模组的标题、简介、背景设定与难度，只返回结构化 patch 建议。
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: native
---
# 修改模组基础信息
修改模组的标题、简介、背景设定与难度，只返回结构化 patch 建议。
## When to use

- 用户要求调整模组标题、简介、设定或难度时。
- 需要把散乱描述整理为基础信息时。
## Do not

- 没有明确修改字段时瞎补内容。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
