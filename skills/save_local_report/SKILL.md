---
name: save_local_report
description: 把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。
scenarios: [play]
metadata:
  author: meathill
  version: "1.0.0"
  group: record
  execution-mode: native
---
# 保存战报到本地文件
把战报写入工作区 `data/reports`，正文为 Markdown，元数据为 frontmatter。

## 当生成战报时（附录处理）
为了保证玩家原始语言的真实性和完整记录，**严禁 AI 凭感觉总结聊天记录**，必须使用内置的解析脚本处理。
- 撰写完 Markdown 战报正文后，**必须**使用 `run_command` 调用本地脚本生成附录：
  ```bash
  node .agents/skills/save_local_report/scripts/append_chat.js <overview_txt_path> <report_markdown_path>
  ```
- `<overview_txt_path>` 是系统提供的对话日志 `overview.txt` 的绝对路径。
- `<report_markdown_path>` 是刚刚写入本地的战报文件的绝对路径。

## When to use

- 每轮或每段游戏总结后需要沉淀战报时。
- 导出本地战报时。

## Do not

- 只在对话里总结而不落盘。
- 漏掉完整聊天记录的附录。
- 尝试通过 AI 纯文本提取代替脚本提取（AI容易漏字或篡改玩家语言）。

## Contract
当前 skill 的参数、边界与返回要求以本文件说明为准。

## Usage
1. 先理解用户当前意图是否真的需要此 skill。
2. 撰写战报正文内容，保存到 `data/reports` 目录。
3. 执行 `node .agents/skills/save_local_report/scripts/append_chat.js` 自动追加聊天记录附录。
4. 如果宿主支持执行层，可把该 skill 映射到项目内的同名实现。
