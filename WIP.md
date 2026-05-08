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
- 当前阶段的“本地环境”指工作区文件，不是浏览器 `localStorage`，也不是数据库。
- 前端页面可以保留为试验产物，但不再作为当前主线继续扩展。
- 当前 runner 只作为最小验证工具，不应反过来主导 SKILLS 设计。
- 近期验证路径应优先面向外部通用 Agent，而不是先围绕某个 SDK 封装运行时。
- 现有 `packages/website/src/lib/ai/dm-tools.ts` 有可复用定义，但目前仍与 `@openai/agents` 耦合，需要抽成普通 AI Agent 也能消费的 contract。

## 已完成

### Phase 1: COC 规则书底座
- [x] 定义规则书实体类型与引用类型
- [x] 创建 `coc-7e-lite` 最小规则包
- [x] 提供规则书查询、实体读取函数
- [x] 提供 COC 场景风险评估函数

### Phase 2: 模组结构接入
- [x] `ScriptDefinition` 增加 `rulesetId`
- [x] 遭遇和 NPC 支持规则书引用
- [x] 剧本解析器支持缺省 `coc-7e-lite`
- [x] 示例剧本接入默认规则书

### Phase 3: Prompt / Skills 规范化
- [x] 更新 DM system prompt：先规则书，再模组，再主持游戏
- [x] 更新 skills 文档：新增规则书能力组
- [x] 明确 COC 风险评估与可玩性校验的职责边界

### Phase 4: 测试验证
- [x] 覆盖规则书查询测试
- [x] 覆盖标准实体读取测试
- [x] 覆盖 COC 场景风险评估测试
- [x] 覆盖模组解析默认 `rulesetId` 与规则书引用测试

## 当前进行中

### Phase 5: Skills Contract
- [x] 抽离规则书能力组的通用 skill schema
- [x] 抽离模组制作能力组的通用 skill schema
- [x] 抽离 `roll_dice` / `create_temp_npc` / `roleplay_npc` 的通用 contract
- [x] 明确每个 skill 的入参、出参、触发条件、禁止行为
- [x] 补充适合 CC / Codex / OpenCode 直接消费的 skills 使用说明与示例

### Phase 6: 本地文件存储
- [x] 设计 `data/modules` / `data/characters` / `data/reports` 目录结构
- [x] 定义文件命名与元数据字段
- [x] 提供读写本地文件的最小工具层
- [x] 让生成的模组、人物卡、战报落盘到工作区

### Phase 7: 外部 Agent 验证
- [x] 准备面向通用 Agent 的 skills 目录与接入说明
- [x] 兼容 `skills` CLI，可通过 `npx skills add <repo>` 安装
- [x] 补齐人物卡 create / patch / validate skills
- [ ] 用至少一种外部 Agent 验证规则书查询、检定、记录落盘闭环
- [ ] 记录哪些能力满足预期，哪些能力还需要补充或收敛

### Phase 8: 最小验证入口
- [x] 提供最小 runner / 脚本入口验证 skills
- [x] 补针对性测试
- [x] 跑格式化
- [x] 跑构建与相关测试

### Phase 9: Website / Play 架构收敛
- [x] website 增加 play 域名与资产域名配置边界
- [x] website 增加 `api/llmproxy` 最小代理骨架与内部 token 鉴权
- [x] 新增 `packages/play` 独立运行时服务
- [x] play 支持 `stub` / `website` / `opencode` 三种 runtime 模式
- [x] play 可通过内部 token 拉取 website 游戏上下文
- [x] 为 website / play 补独立 API 测试与构建验证
- [x] play `stub` runtime 通过 website internal turn 接口统一落库与扣费
- [x] website 将“保存 user/assistant 消息 + 扣费 + 账本”收敛为原子回合写入
- [x] play 接入真实 `opencode` runtime，并通过 website `llmproxy` 发起模型请求
- [x] website 支持 `NEXT_PUBLIC_GAME_CREATION_MODE=play`，可在无 opencode bootstrap 时完整建局并跳转 play
- [x] 真实 smoke 跑通“注册登录 -> website 建局 -> play 发消息 -> website 落库扣费”主链路

### Phase 10: OpenNext Cloudflare 迁移
- [x] 审查 website 当前 `node:sqlite` / `better-auth` / OpenNext Cloudflare 适配缺口
- [x] 将 website 数据库层迁到 Cloudflare D1 兼容实现
- [x] 让 `better-auth` 在 Workers / D1 环境可运行
- [x] 补齐 `wrangler` / OpenNext Cloudflare 配置
- [x] 补充并更新 Cloudflare 部署与验证文档
- [x] 回归验证 `lint` / `format:check` / `typecheck` / `test` / `build`

### Phase 11: Website / Play 彻底合并
- [x] 将 `packages/play` 的游戏页与 runtime 逻辑并入 `packages/website`
- [x] 将 `/games/[id]` 改成主站内直接运行，不再跨域跳转
- [x] 移除 website 建局时的 opencode session bootstrap 主链路
- [x] 清理 `play` package、跨服务自调用代码与相关文档
- [x] 回归验证 `format` / `typecheck` / `test` / `build`

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
