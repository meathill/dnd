# WIP

## 目标
将跑团助手从 Chatbot 架构升级为 **单 DM Agent + Skills** 架构。
Agent Runner 运行在 **Edge Runtime API Route** 中（`@openai/agents`），前端通过 SSE 事件流接收文本和工具调用结果。

## 架构变更记录

### 决策：Agent 运行环境
- ❌ ~~Browser-Side Agent~~：`@openai/agents` 底层依赖 Node.js SDK，纯浏览器 webpack 打包有 polyfill 风险
- ✅ **Edge Runtime API Route**：官方支持 Edge 环境，密钥天然在服务端，兼容 Cloudflare Workers 部署
- ❌ ~~Gemini 支持~~：暂时搁置。`@openai/agents` 锁定 OpenAI 协议，Gemini 需要 `@google/genai` SDK，两者协议不兼容。验证 Agent 跑团优先

### 已淘汰的文件
- `src/app/api/llm-proxy/route.ts` — 不再需要独立 Proxy 层，Agent 直接在 API Route 中调用 OpenAI
- `src/lib/ai/use-dm-agent.ts` — 前端 Agent Runner 方案已废弃

## Todo

### Phase 1: Agent 基础设施 ✅
- [x] 引入 `@openai/agents` + `openai` + `zod` 依赖
- [x] 创建 `src/lib/ai/dm-agent.ts` — DM Agent 定义，动态 instructions 注入剧本/角色/记忆
- [x] 创建 `src/lib/ai/dm-tools.ts` — `roll_dice` 工具，复用 `rules.ts` 检定逻辑
- [x] 重构 `/api/chat/route.ts` — 用 `Runner.run()` 替换 `input-analyzer` + `action-executor` 管线
- [x] SSE 流新增 `tool_call` 和 `tool_result` 事件类型

### Phase 2: 前端 ToolCard UI ✅
- [x] 在 `game-stage.tsx` 中处理新的 `tool_call` / `tool_result` SSE 事件
- [x] 创建 `<ToolCard />` 基础组件，展示检定过程动画
- [x] 骰子动画卡片（掷骰 → 翻转 → 结果揭晓的 CSS 微动画）
- [x] 状态指示器适配新的 Agent 思考过程

### Phase 3: 扩展技能 ✅
- [x] `create_temp_npc` — 随机生成临时 NPC 属性
- [x] `roleplay_npc` — 规范化 NPC 对话行为（从剧本取档）
- [x] `draw_map` — 通过 OpenAI Images API（`gpt-image-2`，可用 `OPENAI_IMAGE_MODEL` 覆盖）生成地图
- [x] `draw_character_art` — 复用同一图像通道生成立绘

### Phase 4: 优化
- [ ] 长对话下的 Token 消耗与性能测试
- [x] Agent maxTurns 提升到 8（容纳多次检定 + NPC + 绘图）；错误中断时持久化已生成的叙事片段
- [ ] 考虑恢复 Gemini 支持（等待 `@openai/agents` 支持自定义 Model Provider 或 Gemini OpenAI 兼容层成熟）

---

## 遗留 / 待确认 (Backlog)
- [ ] 全局地图功能补全（原有 WIP 遗留）
- [ ] 编辑器表单与 DM 隐藏信息（原有 WIP 遗留）
- [x] 清理废弃文件（llm-proxy, use-dm-agent）
