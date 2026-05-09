# DEV NOTE

这里记录开发过程中积累的需要长期关注的事情、架构决策及技术反思。

## 当前阶段核心决策：先做能力层，再做 Client

### 背景

项目原本希望用 `@openai/agents` 快速验证“纯浏览器 Agent”路线：让 DM Agent 在浏览器内运行 loop，前端直接承接工具调用和状态管理。

但实际推进后发现，这个方向的问题不在于“能不能跑”，而在于“能不能稳定、可控、可验证地跑”。

对跑团来说，真正困难的是：

1. DM system prompt 是否足够稳定
2. tools / skills 是否边界明确
3. 模型在真实场景里是否会正确选择并使用这些能力
4. 输出协议是否足够稳定，能够被 UI 长期消费

如果这些问题没有先解决，过早开发 client 只会把未经验证的行为固化成前端实现细节。

### 决策

当前阶段改为：**优先沉淀 skills + system prompt，并通过测试验证；验证通过后，再开发 client。**

补充决策：能力层的第 0 步是规则书。当前优先做 COC，并以项目自定义的 `coc-7e-lite` 最小规则包验证“规则书作为标准库”的路线。

这意味着：

- 不再把“浏览器内完整 Agent Loop”视为当前主目标
- 不再默认依赖某个 Agent SDK 来定义产品架构
- 把 SDK 视为可替换的执行手段，而不是核心产品能力本身
- 先通过 COC 规则书降低模组制作和游玩裁定成本，再继续扩展 DM skills

### 理由

1. **先验证能力，后开发消费层**
   - client 的职责应该是消费稳定能力，而不是与不稳定能力一起试错。

2. **降低错误绑定成本**
   - 如果 prompt、skills、事件协议还在频繁变化，越早做 UI 和 runner，返工越重。

3. **更符合跑团产品本质**
   - 跑团产品最核心的是 DM 行为质量，而不是 Agent Loop 在哪里跑。

4. **保留技术路线灵活性**
   - 后续可以继续用 `@openai/agents`，也可以改成自定义 runner、轻量 orchestration 或混合模式。

## 对 `@openai/agents` 的当前判断

### 结论

`@openai/agents` 可以作为实验和实现手段，但暂时不应成为当前产品路线的中心。

### 原因

- 它没有直接解决跑团对“强约束行为 + 强状态一致性 + 强可视化反馈”的需求。
- 纯浏览器使用时，即便技术上可运行，也未必带来足够好的工程可控性。
- 当前项目最缺的不是 runner，而是对 DM 行为的结构化定义与测试回路。

## 规则书能力：先做 COC

### 决策

当前优先支持 COC，而不是 DND。

### 理由

- COC 的角色与规则门槛更适合新手玩家入坑。
- COC 模组更依赖线索、风险、理智压力和场景推进，适合验证 AI DM 的叙事与裁定能力。
- COC 的第一版规则书可以做成轻量标准库，不需要一开始处理完整 DND CR、法术、装备和职业体系。

### 实施原则

- 不导入商业规则书全文。
- 第一版只做项目自定义的 `coc-7e-lite` 最小规则包。
- 规则书提供标准技能、职业模板、NPC/怪物模板、检定说明、理智损失示例和场景风险评估依据。
- 模组优先引用规则书实体；模组特有内容用覆盖项或自定义实体表达。
- COC 的平衡不使用 DND 式 CR，先使用“战斗风险 / 理智风险 / 线索门槛 / 新手友好度”评估。

### 内容优先级

运行时上下文的优先级为：

1. 本局已发生记录
2. 房规 / 模组覆盖
3. 模组定义
4. COC 规则书
5. AI 即兴裁定

## 后续能力层设计原则

### 1. Skill Contract 优先

每个 skill 都应该明确：

- 何时调用
- 何时禁止调用
- 参数要求
- 返回结构
- client 未来如何消费

### 2. Prompt 分层

DM system prompt 应拆成至少三层：

- 稳定规则层：身份、边界、规则优先级、禁止行为
- 叙事风格层：语气、节奏、类型氛围
- 输出协议层：结构化输出格式、tool 使用说明

这样后续调整时，不会把所有变化揉成一大段 prompt。

### 3. 测试先行

跑团场景验证不能只靠人工“聊几轮感觉不错”。

需要准备标准化 case，覆盖：

- 检定触发
- 临时 NPC 生成
- 关键 NPC 扮演
- 隐藏信息保护
- 奖励型绘图
- 长对话稳定性

### 4. Client 后置

client 在能力未稳定前，不应承担产品定义责任。

它应该在后期承担：

- 文本渲染
- 工具卡渲染
- 状态管理
- 交互反馈

而不是一边做 UI，一边反推 skill 该长什么样。

## 现有代码的处理原则

仓库里已经有一部分 `dm-agent` / `dm-tools` / tool card 相关实现。

当前对这些代码的态度是：

- 视为可复用资产，不是最终架构定论
- 优先提炼其中已经验证过的 skill 定义
- 不急着围绕它们继续扩展一整套 client 交互层

## 当前里程碑定义

当以下条件满足时，才进入 client 开发阶段：

1. 核心 skills 集合稳定
2. DM system prompt 基本稳定
3. 一组典型跑团 case 可以稳定通过
4. 输出协议足以支撑前端消费

## Website / Play 架构收敛

### 决策

- `packages/website` 统一承载控制面与游戏运行时
- `packages/play` 已移除，不再维护独立部署与跨服务调用链路
- 本地和线上都保留 `workspace/{user_id}/{game_id}` 作为服务端目录约定，但公开链接只暴露 `game_id`

### 关键实现约束

- 游戏页直接挂在 `website /games/[id]`
- `GAME_RUNTIME=stub|opencode` 作为唯一运行时开关
- 模型请求和回合落库在同一个 app 内直接调用库函数，不再通过 HTTP 自调用
- `website` 侧将“写 user/assistant 消息 + 扣费 + 账本”收敛成原子回合写入，避免产生半条消息或脏账本

## OpenNext Cloudflare 收尾注意事项

- `packages/website/wrangler.jsonc` 变更后，必须重新执行 `pnpm --dir packages/website exec wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts`
- `@vitejs/plugin-react` 目前固定在 `^5.1.2`；升级到 `6.x` 会在 Vitest 启动时报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，触发点是插件内部对 `vite/internal` 的导入

## 模组创作流程（admin / editor / module_drafts）

### 角色与权限

- **admin** 由 `ADMIN_EMAILS` 环境变量决定，不入库；通过 `resolveAdminEmails()` 异步读取（worker 下走 `getCloudflareContext`，本地落到 `process.env`）。
- **editor** 是 `user.role` 字段的取值（`'user' | 'editor'`，默认 `user`）。仅 admin 可改 role。
- 权限判定集中在 `packages/website/src/lib/auth/permission.ts`，`canAdmin` / `canEdit` 是纯函数便于单测；admin 自动具备 editor 权限。
- API 守卫别再分散到每个路由：admin API 用 `session.isAdmin`；editor API 走 `lib/internal/draft-auth.ts` 的 `requireEditor` / `loadDraftForOwner`。

### skill 加载与场景隔离

- `skills/*/SKILL.md` frontmatter 增加 `scenarios: [authoring | play | both]`。每次改 SKILL.md 后跑 `pnpm skills:build` 重新生成 `src/lib/skills/manifest.generated.ts`。
- `manifest.generated.ts` 是一个普通 ts 模块，入 git，避免 Cloudflare Worker 在运行时读 fs。`prebuild` / `predev` / `pretest` 自动调用生成脚本。
- 系统提示拼装走 `dm-system-prompt.ts:buildSystemPrompt({ scenario, contextSummary })`：根据 scenario 过滤 skill 列表注入到 prompt。游戏 runtime 默认 `play`，创作 runtime 默认 `authoring`。
- 一个 skill 可以同时属于 authoring 和 play（例如 `search_rulebook`、`create_character`）。

### 模组数据流

- 创作期间数据停在 `module_drafts` 表 + `/workspace/modules/drafts/{slug}/`。
- 发布时（`POST /api/module-drafts/[id]/publish`）写入 `modules` 表 + 把 workspace 整体复制到 `/workspace/modules/published/{moduleId}/`。
- 玩家创建 game 时由 `materializeModuleIntoGameWorkspace()` 把已发布 module 复制一份到 `/workspace/{userId}/{gameId}/`，再写一份 `data/modules/{moduleId}.json`。游戏会话只读这份副本，不会污染原始模组。

### Workspace fs 行为

- `OPENCODE_WORKSPACE_ROOT` 未设置时所有 `ensure*Workspace` / `materialize*` / `copyDirectoryIfExists` 都只返回逻辑路径，不真的写盘——这是为了让 Cloudflare Worker 不会在 fs 不可用时报错。
- 本地开发要看到真实文件，需要在 `.env` 设置 `OPENCODE_WORKSPACE_ROOT=/some/path`。

### 草稿创作不扣费

- `authoring-runtime.ts` 不调用 `chargeWallet`/`recordGameTurn`。如果以后要给 editor 计费，应当走单独的账本类型，避免和玩家的 `game` 钱包混在一起。

## VPS 上的 agent-server

### 拓扑

```
[Cloudflare Worker (website)]
    │ HTTP + Bearer
    ▼
[VPS · @dnd/agent-server]  Hono / Node 24
    │
    ├── /workspace/sessions/{id}/   per-session 工作目录（含 .opencode/skills/ 模板）
    │
    └── HTTP → [opencode serve]  agent loop + skill 执行
                 │
                 └── LLM 上游
```

### 关键设计

- **VPS 是模组创作的 single source of truth**：worker 不写 fs，所有 module data 的中间状态都在 VPS workspace 里。worker 的 `module_drafts.data_json` 只在「发布前同步一次」、「stub 模式下保留兜底」两种场景写入。
- **agent_session_id 关联**：`module_drafts.agent_session_id` 字段把 worker 的草稿 id 和 VPS 的 session id 串起来。worker 不知道 opencode 内部 sessionId，agent-server 维护 `agent session ↔ opencode session` 的 1:1 映射。
- **降级策略**：worker 端所有调用 agent-server 的地方都用 `isAgentServerConfigured()` 守卫；未配置时退化成 stub 回复，主链路（创建草稿、发布、开始游戏）仍可走通。这是为了让 worker 部署不强依赖 VPS。
- **skills 同步**：`packages/agent-server/Dockerfile` 在构建时把 `repo/skills/` 复制到镜像 `/var/agent/skills`；session 创建时再复制到该 session workspace 的 `.opencode/skills/`，opencode 自动识别。修改 skill 后要 rebuild docker image。
- **session 持久化**：当前 SessionStore 是内存级（重启会丢索引）。重启后 worker 端那些指向旧 sessionId 的草稿会自动 fallback 到 stub。后续要持久化时可以换 sqlite，agent-server tsconfig / Dockerfile 已经预留 `better-sqlite3` 不冲突。

### 接口契约

完整端点见 `packages/agent-server/README.md` 与 `packages/agent-server/src/types.ts`。worker 端 `lib/agent/client.ts` 的类型必须与 agent-server `src/types.ts` 保持一致——不直接共享类型是因为 worker 包不应依赖 Node 包。

### opencode adapter 的不确定性

`HttpOpencodeAdapter` 按 opencode `/session` 与 `/session/{id}/message` 的常见形态写。但 opencode schema 还在迭代，部署后第一次跑通要看 `http://localhost:4096/doc`（OpenAPI）确认实际响应字段，调整 `extractSkillCalls` 等解析逻辑即可，不影响 agent-server 对外的接口契约。
