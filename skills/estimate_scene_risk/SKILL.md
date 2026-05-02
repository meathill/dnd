---
name: estimate_scene_risk
description: 根据规则书引用、线索门槛与理智损失估算 COC 场景风险。
metadata:
  author: meathill
  version: "1.0.0"
  group: rulebook
  execution-mode: native
---
# 评估场景风险
根据规则书引用、线索门槛与理智损失估算 COC 场景风险。
## When to use

- 制作模组时判断场景风险是否超标。
- 需要估算战斗风险、理智风险和卡关风险时。
## Do not

- 忽略关键线索门槛造成的卡关风险。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
