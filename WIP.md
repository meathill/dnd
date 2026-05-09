# WIP

## 当前目标

当前阶段主线明确如下：

1. 先做出给普通 AI Agent 使用的 SKILLS
2. 把这些 SKILLS 放到 CC / Codex / OpenCode 一类 Agent 中，使用它们自带的 AI provider 实战验证
3. 如果 SKILLS 能力满足预期，再考虑本地 runner 或基于某个 Agent SDK 打包
4. 最后再考虑发布线上版本

## 当前判断

- COC 比 DND 更适合新手入坑，当前优先支持 COC。
- 规则书仍然是第 0 层能力，skills 和模组都应建立在规则书实体之上。
- 当前阶段的"本地环境"指工作区文件，不是浏览器 `localStorage`，也不是数据库。
- 前端页面可以保留为试验产物，但不再作为当前主线继续扩展。
- 当前 runner 只作为最小验证工具，不应反过来主导 SKILLS 设计。
- 近期验证路径应优先面向外部通用 Agent，而不是先围绕某个 SDK 封装运行时。
- 现有 `packages/website/src/lib/ai/dm-tools.ts` 有可复用定义，但目前仍与 `@openai/agents` 耦合，需要抽成普通 AI Agent 也能消费的 contract。

## 进行中

### Phase 7 余项：外部 Agent 验证
- [ ] 用至少一种外部 Agent 验证规则书查询、检定、记录落盘闭环
- [ ] 记录哪些能力满足预期，哪些能力还需要补充或收敛

### Phase 13 余项：VPS Agent Server 上线
- [ ] VPS 实际部署 + `https://agent.your-domain.com` 反代（待用户在 VPS 上 docker compose up + 配置）
- [ ] 第一次跑通后根据 opencode 真实响应调整 `HttpOpencodeAdapter.extractSkillCalls`

## 已归档阶段（详情查 git 历史）

- Phase 1：COC 规则书底座（实体类型、`coc-7e-lite` 规则包、查询函数、风险评估）
- Phase 2：模组结构接入规则书引用与默认 ruleset
- Phase 3：DM system prompt 与 skills 文档规则书化
- Phase 4：规则书 / 实体读取 / COC 风险评估 / 模组解析的测试覆盖
- Phase 5：Skills Contract 抽离（规则书组、模组组、`roll_dice` / `create_temp_npc` / `roleplay_npc`）+ 通用 Agent 使用说明
- Phase 6：本地工作区文件存储（modules / characters / reports）
- Phase 7：面向通用 Agent 的 skills 目录、`skills` CLI 兼容、人物卡 create/patch/validate skills（端到端验证未完）
- Phase 8：最小 runner / 脚本入口与针对性测试
- Phase 9：website / play 架构收敛 + `llmproxy` 代理骨架 + 三种 runtime + 真实 smoke 主链路
- Phase 10：OpenNext Cloudflare 迁移（D1 / better-auth / wrangler）
- Phase 11：`packages/play` 并入 `packages/website`，移除跨域跳转与 opencode session bootstrap 主链路
- Phase 12：模组创作流程（admin/editor/skill 注入/玩家物化），格式化 / lint / typecheck / test / build 通过
- Phase 13：VPS Agent Server 接 opencode（Hono + Docker + worker 接入 + 降级，VPS 实际部署未完）

## 当前新增能力

- `create_character`：按当前剧本快速车卡，并返回 `isValid` / `fieldErrors`
- `patch_character`：在已有角色卡上做局部修改，保留原 `id` 与 `createdAt`
- `validate_character`：显式检查角色卡是否满足剧本限制
- 对外文档已同步加入人物卡闭环验证要求

---

## 暂缓事项

- [ ] 纯浏览器 Agent Loop 落地
- [ ] 继续扩张本地试玩页 UI
- [ ] DND / 其他规则系统接入
- [ ] 围绕某个 SDK 进行深度绑定式重构

## 遗留 / Backlog

- [ ] 数据库 migration 增加 `ruleset_id`
- [ ] 统一 website 侧与本地文件侧的数据模型桥接
- [ ] 全局地图功能补全
- [ ] 编辑器表单与 DM 隐藏信息
- [ ] Gemini 或其他模型接入策略评估
