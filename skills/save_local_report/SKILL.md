---
name: save_local_report
description: 把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。
metadata:
  author: meathill
  version: "1.0.0"
  group: record
  execution-mode: native
---
# 保存战报到本地文件
把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。
## When to use

- 每轮或每段游戏总结后需要沉淀战报时。
- 导出本地战报时。
## Do not

- 只在对话里总结而不落盘。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
