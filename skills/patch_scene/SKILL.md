---
name: patch_scene
description: 新增或更新一个场景，只返回结构化 patch 建议。
scenarios: [authoring]
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: native
---
# 新增或修改场景
新增或更新一个场景，只返回结构化 patch 建议。
## When to use

- 用户要求补场景、重写场景或调整线索钩子时。
## Do not

- 更新现有场景时编造不存在的 id。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
