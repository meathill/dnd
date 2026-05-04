# 肉团长 Website

新版网站负责：

1. 登录与会话
2. 从数据库读取模组列表与模组摘要
3. 创建游戏并绑定 `opencode session`
4. 转发游戏消息并按回合扣费

## 环境变量

```bash
BETTER_AUTH_SECRET=change-me
APP_BASE_URL=https://muirpg.com
PLAY_BASE_URL=https://play.muirpg.com
ASSET_BASE_URL=https://i.muirpg.com
AUTH_COOKIE_DOMAIN=.muirpg.com
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
- `AUTH_COOKIE_DOMAIN`：跨子域共享登录 cookie 时使用，例如 `.muirpg.com`
- `INTERNAL_SERVICE_TOKEN` / `INTERNAL_SERVICE_TOKENS`：play 等内部服务访问 website 代理接口时使用
- `LLM_PROXY_UPSTREAM_BASE_URL`：`/api/llmproxy/*` 的实际模型上游地址，建议使用 OpenAI-compatible 接口
- `LLM_PROXY_UPSTREAM_API_KEY`：写给上游模型服务的 API Key，不会把内部 token 透传过去
- `LLM_PROXY_ALLOWED_MODELS`：可选模型白名单，逗号或空格分隔
- `OPENCODE_BASE_URL`：website 服务端访问 opencode API 的地址，可填内网地址

## 架构约定

- `muirpg.com`：website 控制面，负责登录、模组、账单、建局，以及 `api/llmproxy`
- `play.muirpg.com`：游戏运行时，最终入口为 `/{gameId}`
- `i.muirpg.com`：图片、音频、视频等生成资产的公开访问域名
- `workspace/{user_id}/{game_id}`：服务端工作区目录约定，不作为公开路由暴露

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
