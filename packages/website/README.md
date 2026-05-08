# 肉团长 Website

新版网站现在同时负责：

1. 登录与会话
2. 从数据库读取模组列表与模组摘要
3. 创建游戏与初始化工作区
4. 承载 `/games/[id]` 统一游戏运行页
5. 维护消息、钱包与账本
6. 直接调用上游模型完成回合推进

## 环境变量

```bash
BETTER_AUTH_SECRET=change-me
NEXT_PUBLIC_APP_BASE_URL=https://muirpg.meathill.com
NEXT_PUBLIC_ASSET_BASE_URL=https://i.muirpg.meathill.com
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.muirpg.meathill.com
GAME_RUNTIME=opencode
GAME_LLM_MODEL=gpt-4.1-mini
NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL=https://api.openai.com
LLM_PROXY_UPSTREAM_API_KEY=replace-me
NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS=gpt-4.1-mini,gpt-4o-mini
OPENCODE_WORKSPACE_ROOT=/path/to/workspace
DATABASE_URL=/absolute/path/to/website.sqlite
```

不设置 `DATABASE_URL` 时，默认使用 `packages/website/.local/website.sqlite`。

- `NEXT_PUBLIC_APP_BASE_URL`：主站域名，用于 auth 与公共链接
- `NEXT_PUBLIC_ASSET_BASE_URL`：媒体资源域名，后续用于图片/音频/视频访问
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`：跨子域共享登录 cookie 时使用，例如 `.muirpg.meathill.com`
- `GAME_RUNTIME`：统一游戏运行模式，支持 `stub` 与 `opencode`
- `GAME_LLM_MODEL`：`GAME_RUNTIME=opencode` 时使用的模型标识
- `NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL`：上游模型服务地址，建议使用 OpenAI-compatible 接口
- `LLM_PROXY_UPSTREAM_API_KEY`：写给上游模型服务的 API Key
- `NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS`：可选模型白名单，逗号或空格分隔
- `OPENCODE_WORKSPACE_ROOT`：服务端工作区根目录，游戏仍按 `workspace/{user_id}/{game_id}` 建目录

## 游戏运行模式

### `GAME_RUNTIME=stub`

- 不请求真实模型
- 建局后直接进入主站 `/games/[id]`
- 仍会真实落库、扣费、写账本
- 适合本地联调与基础 smoke

### `GAME_RUNTIME=opencode`

- 直接从主站内调用上游模型
- 使用当前游戏上下文拼装消息并推进回合
- 仍通过同一套仓储原子写入 user/assistant 消息与扣费
- 是当前推荐主线

## 架构约定

- `muirpg.meathill.com`：统一承载控制面与游戏运行页
- `i.muirpg.meathill.com`：图片、音频、视频等生成资产的公开访问域名
- `workspace/{user_id}/{game_id}`：服务端工作区目录约定，不作为公开路由暴露

## 本地完整联调

如果目标是验证“登录 -> 建局 -> 进入 `/games/[id]` -> 发消息 -> 落库扣费”主链路，推荐使用：

```bash
# website
NEXT_PUBLIC_APP_BASE_URL=http://127.0.0.1:3090
DATABASE_URL=/absolute/path/to/website.sqlite
BETTER_AUTH_SECRET=dev-secret-change-me
GAME_RUNTIME=opencode
GAME_LLM_MODEL=gpt-4.1-mini
NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL=https://api.openai.com
LLM_PROXY_UPSTREAM_API_KEY=replace-me
NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS=gpt-4.1-mini
OPENCODE_WORKSPACE_ROOT=/absolute/path/to/workspace
```

如果只是验证前端与持久化链路，可改成：

```bash
GAME_RUNTIME=stub
```

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
