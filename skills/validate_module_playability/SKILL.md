---
name: validate_module_playability
description: 检查模组是否具备开场、场景、探索区域、隐藏真相和推进节点。
metadata:
  author: meathill
  version: "1.0.0"
  group: module
  execution-mode: native
---
# 检查模组可玩性
检查模组是否具备开场、场景、探索区域、隐藏真相和推进节点。
## When to use

- 模组草稿整理完成后做可玩性验收。
- 开团前确认不会因为缺线索或缺场景直接卡死。
## Do not

- 模组信息不足时直接开团。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
