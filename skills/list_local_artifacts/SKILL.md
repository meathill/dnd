---
name: list_local_artifacts
description: 列出工作区中已经保存的模组、人物卡或战报。
metadata:
  author: meathill
  version: "1.0.0"
  group: record
  execution-mode: native
---
# 列出本地产物
列出工作区中已经保存的模组、人物卡或战报。
## When to use

- 需要查看当前工作区已有本地产物时。
- 在保存前后确认持久化结果时。
## Do not

- 重复生成已存在产物而不先检查。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
