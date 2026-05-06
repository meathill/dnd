# 肉团长 Website

新版网站负责：

1. 登录与会话
2. 从数据库读取模组列表与模组摘要
3. 创建游戏，并按模式选择 `opencode` bootstrap 或直接交给 `play` 托管
4. 维护消息、钱包、账本，以及内部 `turn` 回写接口
5. 提供 `api/llmproxy` 统一代理模型请求

## 环境变量

```bash
BETTER_AUTH_SECRET=change-me
APP_BASE_URL=https://muirpg.meathill.com
PLAY_BASE_URL=https://play.muirpg.meathill.com
ASSET_BASE_URL=https://i.muirpg.meathill.com
AUTH_COOKIE_DOMAIN=.muirpg.meathill.com
GAME_CREATION_MODE=opencode
INTERNAL_SERVICE_TOKEN=replace-me
LLM_PROXY_UPSTREAM_BASE_URL=https://api.openai.com
LLM_PROXY_UPSTREAM_API_KEY=replace-me
LLM_PROXY_ALLOWED_MODELS=gpt-4.1-mini,gpt-4o-mini
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_SERVER_USERNAME=opencode
OPENCODE_SERVER_PASSWORD=secret
OPENCODE_WORKSPACE_ROOT=/path/to/workspace
DATABASE_URL=/absolute/path/to/website.sqlite
```

不设置 `DATABASE_URL` 时，默认使用 `packages/website/.local/website.sqlite`。

- `APP_BASE_URL`：主站域名，用于 auth 与公共链接
- `PLAY_BASE_URL`：游戏域名；设置后建局接口会返回 `https://play.../{gameId}`，主站的 `/games/{gameId}` 也会直接跳转过去
- `ASSET_BASE_URL`：媒体资源域名，后续用于图片/音频/视频访问
- `AUTH_COOKIE_DOMAIN`：跨子域共享登录 cookie 时使用，例如 `.muirpg.meathill.com`
- `GAME_CREATION_MODE`：建局模式。默认 `opencode`；设为 `play` 时，website 只负责建局和 workspace，不再创建 opencode session，适合本地完整联调
- `INTERNAL_SERVICE_TOKEN` / `INTERNAL_SERVICE_TOKENS`：play 等内部服务访问 website 代理接口时使用
- `LLM_PROXY_UPSTREAM_BASE_URL`：`/api/llmproxy/*` 的实际模型上游地址，建议使用 OpenAI-compatible 接口
- `LLM_PROXY_UPSTREAM_API_KEY`：写给上游模型服务的 API Key，不会把内部 token 透传过去
- `LLM_PROXY_ALLOWED_MODELS`：可选模型白名单，逗号或空格分隔
- `OPENCODE_BASE_URL`：website 服务端访问 opencode API 的地址，可填内网地址；仅 `GAME_CREATION_MODE=opencode` 时必需

## 建局模式

### `GAME_CREATION_MODE=opencode`

- 默认模式
- website 建局时会创建 opencode session
- 适合保留旧 website 消息链路或需要立即 bootstrap 工作区的场景

### `GAME_CREATION_MODE=play`

- website 建局时不再调用 opencode
- 建局完成后直接把游戏交给 `play` 域运行
- 适合本地完整联调，以及未来以 `play` 为主运行时的正式架构
- 此模式要求配置 `PLAY_BASE_URL`

play 托管的游戏会写入一个内部保留的 `opencodeSessionId` 哨兵值，website 旧的 `/api/games/[id]/messages` 会直接拒绝这类游戏，避免双写到两套运行时

## 架构约定

- `muirpg.meathill.com`：website 控制面，负责登录、模组、账单、建局，以及 `api/llmproxy`
- `play.muirpg.meathill.com`：游戏运行时，最终入口为 `/{gameId}`
- `i.muirpg.meathill.com`：图片、音频、视频等生成资产的公开访问域名
- `workspace/{user_id}/{game_id}`：服务端工作区目录约定，不作为公开路由暴露

## 本地完整联调

如果目标是验证“登录 -> website 建局 -> play 发消息 -> website 落库扣费”主链路，推荐使用：

```bash
# website
APP_BASE_URL=http://127.0.0.1:3090
PLAY_BASE_URL=http://127.0.0.1:3091
DATABASE_URL=/absolute/path/to/website.sqlite
BETTER_AUTH_SECRET=dev-secret-change-me
INTERNAL_SERVICE_TOKEN=replace-me
GAME_CREATION_MODE=play
LLM_PROXY_UPSTREAM_BASE_URL=https://api.openai.com
LLM_PROXY_UPSTREAM_API_KEY=replace-me
LLM_PROXY_ALLOWED_MODELS=gpt-4.1-mini
```

此时不需要 `OPENCODE_BASE_URL` 也能完整建局；是否真正请求模型，取决于 `play` 的 `PLAY_RUNTIME`

## 开发

```bash
pnpm dev
```

## 类型检查

```bash
pnpm typecheck
```

## 测试

```bash
pnpm test
```

## 构建

```bash
pnpm build
```

如果修改了 `wrangler.jsonc`，记得同步更新 Cloudflare env 类型：

```bash
pnpm exec wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts
```
