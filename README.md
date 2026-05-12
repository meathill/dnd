肉团长
===

> Live: https://muirpg.meathill.com

肉团长是一个基于 AI 的跑团工具。让玩家可以在一个近乎无比自由的环境当中去进行跑团的游戏。
我想要充分利用 AI 无限拓展的可能，将 DND 或者 COC 的跑团融入其中。
我们不能让像一般的酒馆那样，让用户拥有几乎无限的权利。我认为那样的话，对游戏体验是一种伤害。
但是我也不想像标准的 CRPG 那样，用户只能在一个相当有限的框架内游戏。
所以我希望做一个新的产品出来。


项目结构
---

- `packages/website` 主站与游戏运行时（登录、模组、计费、建局、游戏页）
- `packages/agent-server` VPS 上跑的 agent runner，转发 worker 请求到本机 `opencode serve`，模组创作流程使用
- `packages/core` 共享库
- `packages/mobile` 移动应用


当前运行架构
---

- `muirpg.meathill.com` 承载 `packages/website`，负责登录、模组、账单、建局和真实游戏运行时
- `i.muirpg.meathill.com` 预留给图片、音频、视频等生成资产
- 服务端工作区目录保持为 `workspace/{user_id}/{game_id}`，但公开链接只暴露 `game_id`


本地联调
---

当前推荐的本地完整链路如下：

- `GAME_RUNTIME=opencode` 或 `GAME_RUNTIME=stub`
- 使用同一个 `packages/website`
- 游戏入口统一为 `/games/{gameId}`

最小必需环境变量：

website:
`BETTER_AUTH_SECRET`
`NEXT_PUBLIC_APP_BASE_URL`
`DATABASE_URL`
`GAME_RUNTIME`
`GAME_LLM_MODEL`
`OPENCODE_WORKSPACE_ROOT`

如果要测试 `GAME_RUNTIME=opencode`，还需要：

`NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL`
`LLM_PROXY_UPSTREAM_API_KEY`
`NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS`

更细的说明见：

- `packages/website/README.md`
- `DEPLOYMENT.md`（含 `agent-server` VPS 部署与模组创作会话接入步骤）


技术栈
---

- Next.js
- Coss UI https://coss.com/ui/docs
- TailwindCSS v4
- TypeScript
- Node.js 24
- better-auth
- SQLite / Cloudflare D1


当前部署形态
---

- `packages/website` 已补齐 OpenNext Cloudflare Workers 入口，并在 Workers 下使用 D1
- 本地 Node.js 开发 / 测试仍支持 SQLite 文件

完整部署说明见 `DEPLOYMENT.md`。

登录与会话
---

- 使用 better-auth 的邮箱 + 密码注册/登录，不需要邮箱验证。
- 需要配置 `BETTER_AUTH_SECRET`（Cloudflare secret 或本地环境变量）用于会话签名。
- better-auth 使用 `user` / `account` / `session` / `verification` 四张表，已加入迁移。

数据结构（核心约束）
---

- 剧本是核心元素，定义场景与战斗，同时限定人物卡可选项（技能、装备、职业、出身、Buff / Debuff、属性范围）以及数量上限（技能 / 装备 / Buff / Debuff），默认使用规则内的属性点预算与范围。
- 剧本包含开场对白（openingMessages），用于进入游戏时的背景简介与环境描述。
- 人物卡必须绑定 `scriptId`，不能跨剧本复用；角色的可选项需受剧本限制，自由字段主要是名字、背景、动机等文本描述。人物卡归属到用户（`user_id`）。
- 人物卡支持头像（avatar），用于游戏内展示。
- 人物卡记录幸运值（COC 3D6×5），随角色存档。
- 头像存储在 R2（绑定名 `ASSETS_BUCKET`，桶名 `dnd`），对外域名由 `NEXT_PUBLIC_ASSET_BASE_URL` 提供。
- 游戏由 `scriptId + characterId` 开始，确保人物卡与剧本一一匹配；人物卡不可被多次开局复用。
- 首页展示剧本列表与游戏记录，点击剧本进入详情页建卡，完成后开始游戏；也可从首页继续游戏记录。
- 路由约定：模组详情 `/modules/:id`，进入游戏 `/games/:id`。
- 个人设置存储在 `user_settings`（AI provider / model / dm_profile_id），并在 `get_session` 时返回。
- DM 指南拆分为“初步验证”和“具体叙事”，以全局 `dm_profiles` 管理，默认使用 `is_default=1` 的风格，用户可选择不同 DM 风格。
- root 用户由环境变量指定，可进入全局配置页面维护 DM 风格与规则。
  - 推荐：`ROOT_USER_IDS` 或 `ROOT_USER_EMAILS`（逗号/换行分隔）。
  - 也支持单个值：`ROOT_USER_ID` / `ROOT_USER_EMAIL`。
- 服务端会校验人物卡选项是否落在剧本清单内，确保无法绕过限制。
- COC 点购默认采用 8 项属性总计 460 点的预算，属性点总和不得超过预算；剧本仅在需要房规时覆盖默认规则。
- 当 `attribute_ranges_json` 为空或 `attribute_point_budget` 为 0 时，使用规则默认值。
- 默认属性范围（COC 7e 掷骰）：力量/敏捷/体质/意志/外貌 15-90，体型/智力/教育 40-90。
- 点购范围默认沿用上述范围；界面会显示“规则推荐最低值”（默认为规则下限），即便剧本放宽范围也仅提示不强制。
- 技能分配默认采用 quick-start：核心技能值 70×1、60×2、50×3，兴趣技能 2 项 +20（可通过 rules 覆盖）。
- 如需点购，设置 rules.skillAllocationMode="budget"；未指定 skillPointBudget 时使用 COC 7e（教育×4 + 智力×2），也可覆盖为固定预算。
- 技能默认上限 75，可通过 rules 覆盖。
- 减益状态默认不在建卡流程中出现，仅当剧本设置 debuffLimit>0 才要求选择，并默认预选前 N 项（可调整但必须选满）。
- 技能检定由服务端函数执行，AI 只提供检定类型与参数（dc/技能/属性）；训练技能默认 50，未训练技能默认 20，dc 按规则/剧本/情境决定。


游戏体验
---

整个游戏仍然像一般的跑团那样。

- DM 也就是肉团长负责描述环境，然后接手用户的输入。
- 用户创建角色卡上面会记录角色的各种属性、装备技能等等。
- 通过创建游戏模组来控制游戏的环境和规则。
- 玩家在文本框输入他想采用的行为和要说的话。
- AI 需要判断哪些是用户说的话，哪些是用户要采取的行为，哪些是用户希望对周边世界世家的影响。然后根据规则来分别应对这些东西。既要让玩家能够更自由的与这个世界互动，也不能让玩家自意的改变这个世界。


开发计划
---

1. 网页版，我自己尝试
    1. 只支持 COC
    2. 支持添加简单模组
    3. 自动时间流动
2. 支持复杂模组，支持复杂交互
    1. 支持 BYOK
3. 支持 DND
4. 支持移动应用
