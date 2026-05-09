---
name: save_local_module
description: 把结构化模组写入工作区 `data/modules`。
scenarios: [authoring]
metadata:
  author: meathill
  version: "1.0.0"
  group: record
  execution-mode: native
---
# 保存模组到本地文件
把结构化模组写入工作区 `data/modules`。
## When to use

- 模组草稿确认后需要落盘时。
- AI 生成模组后需要写入工作区文件时。
## Do not

- 只在自然语言里声称已保存，但没有真正写入文件。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
