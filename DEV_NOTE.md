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

- `packages/website` 作为控制面，负责登录、模组、账单、建局和 `api/llmproxy`
- `packages/play` 作为独立运行时，负责真实游戏聊天与回合推进
- 本地和线上都保留 `workspace/{user_id}/{game_id}` 作为服务端目录约定，但公开链接只暴露 `game_id`

### 关键实现约束

- `website` 与 `play` 之间优先通过内部 token 通信，而不是直接共享服务端状态
- `play` 的 `stub` 和 `opencode` runtime 最终都必须通过 website internal turn 接口统一落库和扣费
- `website` 侧将“写 user/assistant 消息 + 扣费 + 账本”收敛成原子回合写入，避免产生半条消息或脏账本

### 建局模式

- `GAME_CREATION_MODE=opencode`：保留旧模式，建局时创建 opencode session
- `GAME_CREATION_MODE=play`：建局时不依赖 opencode bootstrap，直接交给 `play` 域运行

新增 `GAME_CREATION_MODE=play` 的原因不是为了兼容两套长期并存的产品形态，而是为了让“完整建局 -> 进入 play -> 发消息 -> 持久化/扣费”主链路可以在没有 opencode bootstrap 的情况下独立验证，并与未来以 `play` 为主运行时的正式架构保持一致

## OpenNext Cloudflare 收尾注意事项

- `packages/website/wrangler.jsonc` 变更后，必须重新执行 `pnpm --dir packages/website exec wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts`
- `packages/play/wrangler.jsonc` 变更后，必须重新执行 `pnpm --dir packages/play exec wrangler types --env-interface CloudflareEnv ./cloudflare-env.generated.d.ts`
- `packages/play/cloudflare-env.d.ts` 只负责补充 `wrangler types` 不会自动产出的 secret / 可选环境变量声明，例如 `INTERNAL_SERVICE_TOKEN` 与 `DM_SYSTEM_PROMPT`
- `@vitejs/plugin-react` 目前固定在 `^5.1.2`；升级到 `6.x` 会在 Vitest 启动时报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，触发点是插件内部对 `vite/internal` 的导入

## opencode server 自托管与 Cloudflare Access

### 决策

- opencode server 跑在 GCP VM `34.177.119.169`，对外通过 Cloudflare Tunnel 暴露成 `https://opencode.muirpg.meathill.com`
- 服务对服务认证（Cloudflare Workers Website → opencode）走 Cloudflare Access Service Token，不再用 Basic Auth
- opencode 进程只监听 `127.0.0.1:4096`，VM 不开公网入站端口

### 理由

- Workers + Tunnel + Access 同属一个 Cloudflare 账号，身份体系不分裂
- 边缘做 TLS 与 auth，VM 不需要 caddy/nginx/Let's Encrypt 续期
- Service Token 在 Zero Trust Dashboard 一键签发/吊销，比维护 Basic Auth 用户名密码省心

### 代码影响

- [packages/website/src/lib/opencode/client.ts](packages/website/src/lib/opencode/client.ts) 不再读 `OPENCODE_SERVER_USERNAME` / `OPENCODE_SERVER_PASSWORD`，改读 `OPENCODE_ACCESS_CLIENT_ID` / `OPENCODE_ACCESS_CLIENT_SECRET`，发送 `CF-Access-Client-Id` / `CF-Access-Client-Secret`
- 本地开发默认指向 `http://127.0.0.1:4096` 不发任何 auth header，与本机直连兼容

### 排错入口

- 全部 403 → CF Access policy 没绑到 Service Token
- 全部 530/521 → cloudflared 没起来或 ingress 配错；`sudo systemctl status cloudflared`
- 200 但 opencode 报错 → 检查 `~/.config/opencode/auth.json` LLM provider key
