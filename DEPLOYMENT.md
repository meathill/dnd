# 部署指南

本文档描述当前仓库的默认部署方案。

当前推荐部署方式：

1. `packages/website` 通过 OpenNext 部署到 Cloudflare Workers
2. `website` 在 Workers 上使用 Cloudflare D1
3. 游戏运行页直接挂在同一个 `website` 服务内
4. 本地开发 / 测试继续使用 Node.js + SQLite 文件

## 当前状态

### 已验证能力

- `website` 可以正常 `build`
- 主站支持统一游戏运行时：`stub` / `opencode`
- 游戏入口统一为 `/games/{id}`
- 已真实 smoke 跑通：
  `注册登录 -> website 建局 -> website 发消息 -> website 落库扣费`

### 当前不建议宣称已支持的部署形态

- 完整的 Cloudflare 部署 smoke 还需要在线环境再做一轮

## 架构

### 域名职责

- `muirpg.meathill.com` -> `packages/website`
- `i.muirpg.meathill.com` -> 媒体资产域名

### 服务职责

`website` 负责：

- 登录与 session
- 模组 / 人物卡 / 游戏记录读取
- 建局
- 统一游戏运行页 `/games/[id]`
- 钱包、账本、消息落库
- 调用上游模型推进回合

### 工作区

- 服务端目录约定：`workspace/{user_id}/{game_id}`
- 对外公开 URL 仅暴露 `game_id`

## 运行模式

### 模式 A：最小联调模式

适合先验证登录、建局、落库、扣费。

- `website`: `GAME_RUNTIME=stub`

特点：

- 不依赖真实模型
- 能验证绝大多数主链路

### 模式 B：完整模型联调模式

适合验证真实模型回合推进。

- `website`: `GAME_RUNTIME=opencode`

特点：

- 真实走模型上游
- 不再依赖独立 `play` 服务
- 当前最接近目标架构

## 环境准备

### 基础要求

- Node.js >= 24（本地开发与构建）
- pnpm >= 10
- Cloudflare Workers + D1 + R2

### 目录建议

```bash
/srv/muirpg/
  repo/
  data/
    website.sqlite
  workspace/
```

## Website 部署

### 必需环境变量

```bash
BETTER_AUTH_SECRET=change-me
NEXT_PUBLIC_APP_BASE_URL=https://muirpg.meathill.com
DATABASE_URL=/srv/muirpg/data/website.sqlite
GAME_RUNTIME=opencode
GAME_LLM_MODEL=gpt-4.1-mini
OPENCODE_WORKSPACE_ROOT=/srv/muirpg/workspace
```

### 如果要启用跨子域登录

```bash
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.muirpg.meathill.com
```

### 如果要启用真实模型

```bash
NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL=https://api.openai.com
LLM_PROXY_UPSTREAM_API_KEY=replace-me
NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS=gpt-4.1-mini,gpt-4o-mini
```

### 构建命令

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/website build
```

Cloudflare 部署时继续执行 `opennextjs-cloudflare build` / `wrangler deploy`。

如果修改了 `packages/website/wrangler.jsonc`，记得同步更新类型：

```bash
pnpm --dir packages/website exec wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts
```

Cloudflare 上建议通过 `wrangler secret put` 配置敏感变量，例如：

- `BETTER_AUTH_SECRET`
- `LLM_PROXY_UPSTREAM_API_KEY`

## Agent Server 部署（VPS）

`packages/agent-server` 是部署在 VPS 上的 agent runner。它接收 worker 的 HTTP 请求，转发给同一台机器上的 `opencode serve`，并维护每个 session 的 workspace 目录。

详细部署步骤见 [`packages/agent-server/README.md`](packages/agent-server/README.md)。最简流程：

```bash
git clone https://github.com/meathill/dnd.git
cd dnd/packages/agent-server
cat > .env <<EOF
AGENT_SERVER_TOKEN=$(openssl rand -hex 32)
OPENCODE_SERVER_PASSWORD=$(openssl rand -hex 32)
EOF
docker compose up -d
```

VPS 前置加 Caddy / nginx 做 TLS，对外暴露形如 `https://agent.your-domain.com`。

### 把 agent-server 接入 worker

`packages/website/wrangler.jsonc` 已经预留 `OPENCODE_AGENT_BASE_URL` 字段：

```jsonc
"vars": {
  "OPENCODE_AGENT_BASE_URL": "https://agent.your-domain.com"
}
```

然后注入 token（不要写进 `wrangler.jsonc`）：

```bash
pnpm --dir packages/website exec wrangler secret put OPENCODE_AGENT_TOKEN
# 粘贴上面的 AGENT_SERVER_TOKEN 值
```

未配置 `OPENCODE_AGENT_BASE_URL` / `OPENCODE_AGENT_TOKEN` 时，模组创作会话会回退到 stub 回复，主链路不影响（创建草稿、发布、玩家开始游戏都仍然能跑）。

## 推荐部署顺序

1. 部署 `website`（先不启用 agent-server，模组创作走 stub）
2. 配置反向代理
3. 配置 `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`
4. 先用 `GAME_RUNTIME=stub` 跑通主链路
5. 切到 `GAME_RUNTIME=opencode` 验证模型回合
6. VPS 上部署 `agent-server` + opencode，配 `OPENCODE_AGENT_BASE_URL` / `OPENCODE_AGENT_TOKEN`，验证模组创作会话能调用 skill

## 上线前检查

至少确认以下接口与页面可用：

- `GET /api/session`
- `GET /api/modules`
- `POST /api/games`
- `GET /api/games/{id}`
- `POST /api/games/{id}/messages`
- `GET /games/{id}`

## 常见问题

### 建局成功但进入游戏后 404

通常是该 game 不属于当前登录用户，或部署环境数据库没有同步对应数据。

### 发消息时报 `LLM 上游未配置`

说明当前用了 `GAME_RUNTIME=opencode`，但没有设置：

- `NEXT_PUBLIC_LLM_PROXY_UPSTREAM_BASE_URL`
- `LLM_PROXY_UPSTREAM_API_KEY`

### 发消息时报 `模型未开放`

检查 `NEXT_PUBLIC_LLM_PROXY_ALLOWED_MODELS` 是否包含当前 `GAME_LLM_MODEL`。

### 登录成功但请求接口仍返回 401

通常是 cookie 域、反向代理头或 `NEXT_PUBLIC_APP_BASE_URL` 配置不完整。优先检查：

- `NEXT_PUBLIC_APP_BASE_URL`
- `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`
- 反向代理是否正确透传 `Host` 和 `X-Forwarded-Proto`
