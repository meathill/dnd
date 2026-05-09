---
name: select_ruleset
description: 列出当前可用规则系统，默认返回 coc-7e-lite。
scenarios: [authoring, play]
metadata:
  author: meathill
  version: "1.0.0"
  group: rulebook
  execution-mode: native
---
# 选择规则系统
列出当前可用规则系统，默认返回 coc-7e-lite。
## When to use

- 开始制作模组前确认当前规则系统。
- 用户未明确说明规则系统时回到 COC 默认值。
## Do not

- 把模组特例误当作规则书默认规则。
## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。
## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 根据本技能的说明填写参数。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
