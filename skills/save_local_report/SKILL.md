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

## 当生成战报时（非常重要）
- **必须**在战报文件的最后面加上一个 `# 附录：完整聊天记录` 章节。
- **必须**从系统日志或者当前对话上下文中，提取出与跑团剧情相关的所有【玩家输入】和【GM输出（包括检定结果和叙事片段）】，并按时间顺序记录在附录里。
- 玩家的原始语言风格十分珍贵，提取时务必保持原汁原味。

## When to use

- 每轮或每段游戏总结后需要沉淀战报时。
- 导出本地战报时。

## Do not

- 只在对话里总结而不落盘。
- 漏掉完整聊天记录的附录。

## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。

## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 撰写战报正文内容，并将完整的对话记录追加到结尾。
3. 不要在正文里伪造 tool 调用结果。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
