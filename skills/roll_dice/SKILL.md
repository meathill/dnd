---
name: roll_dice
description: 执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。
metadata:
  author: meathill
  version: "1.0.0"
  group: gameplay
  execution-mode: native
---
# 执行检定
执行技能、属性、幸运、理智或战斗检定，返回结构化结果与展示文本。
## When to use

- 技能检定。
- 属性检定。
- 幸运检定。
- 理智检定。
- 战斗技能判定。
## Do not

- 不调用 skill 就直接宣布成功或失败。
- 把纯叙事动作滥用成检定。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
