---
name: patch_options
description: 修改模组的装备、出身、buff、debuff 选项池，只返回结构化 patch 建议。
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: native
---
# 修改模组选项池
修改模组的装备、出身、buff、debuff 选项池，只返回结构化 patch 建议。
## When to use

- 用户要求调整可选装备、出身、buff 或 debuff 时。
## Do not

- 把增量 patch 误当成追加，导致列表语义不清。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
