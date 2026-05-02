---
name: validate_character
description: 检查人物卡是否满足当前剧本的职业、属性、技能与装备限制。
metadata:
  author: meathill
  version: "1.0.0"
  group: character
  execution-mode: native
---
# 校验人物卡
检查人物卡是否满足当前剧本的职业、属性、技能与装备限制。
## When to use

- 人物卡创建或修改后需要确认是否合法时。
- 保存人物卡前需要做一次结构化验收时。
## Do not

- 不做校验就直接把人物卡当成可用成品。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
