# 部署指南

本文档描述**当前仓库真实可部署**的方案，而不是历史目标架构。

当前推荐部署方式：

1. `packages/website` 部署到一台支持 Node.js 24 的服务上
2. `packages/play` 部署到另一台或同一台支持 Node.js 24 的服务上
3. `website` 使用本地 SQLite 文件
4. `play` 通过 `website` 的内部接口与 `llmproxy` 完成会话、持久化与扣费

## 当前状态

### 已验证能力

- `website` / `play` 都可以正常 `build`
- `play` 支持三种 runtime：`stub` / `website` / `opencode`
- `website` 支持 `GAME_CREATION_MODE=play`
- 已真实 smoke 跑通：
  `注册登录 -> website 建局 -> play 发消息 -> website 落库扣费`

### 当前不建议宣称已支持的部署形态

- Cloudflare Workers 生产部署
- Cloudflare D1 生产部署

原因：当前 `packages/website` 的数据库层基于 Node.js `node:sqlite`，不是 D1 adapter。

## 架构

### 域名职责

- `muirpg.com` -> `packages/website`
- `play.muirpg.com` -> `packages/play`
- `i.muirpg.com` -> 未来媒体资产域名

### 服务职责

`website` 负责：

- 登录与 session
- 模组 / 人物卡 / 游戏记录读取
- 建局
- 钱包、账本、消息落库
- `api/llmproxy`
- internal turn 回写接口

`play` 负责：

- 游戏运行页
- 游戏上下文读取
- 聊天输入处理
- 调用 `website llmproxy`
- 将 user/assistant 回合写回 `website`

### 工作区

- 服务端目录约定：`workspace/{user_id}/{game_id}`
- 对外公开 URL 仅暴露 `game_id`

## 部署模式

### 模式 A：最小联调模式

适合先验证登录、建局、跳转、落库、扣费。

- `website`: `GAME_CREATION_MODE=play`
- `play`: `PLAY_RUNTIME=stub`

特点：

- 不依赖真实模型
- 不依赖 opencode bootstrap
- 能验证绝大多数链路

### 模式 B：完整模型联调模式

适合验证 `play -> llmproxy -> website turn` 主链路。

- `website`: `GAME_CREATION_MODE=play`
- `play`: `PLAY_RUNTIME=opencode`

特点：

- 真实走模型代理
- 不依赖 website 建局时的 opencode session bootstrap
- 当前最接近目标架构

### 模式 C：旧 website bootstrap 模式

仅用于兼容旧链路或保留历史能力。

- `website`: `GAME_CREATION_MODE=opencode`
- `play`: 任意

特点：

- 建局时创建 opencode session
- 仍保留旧 website 消息链路
- 不是当前推荐主线

## 环境准备

### 基础要求

- Node.js >= 24
- pnpm >= 10
- Linux VPS 或其他可运行 Node.js 服务的环境

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
APP_BASE_URL=https://muirpg.com
PLAY_BASE_URL=https://play.muirpg.com
DATABASE_URL=/srv/muirpg/data/website.sqlite
INTERNAL_SERVICE_TOKEN=replace-me
GAME_CREATION_MODE=play
OPENCODE_WORKSPACE_ROOT=/srv/muirpg/workspace
```

### 如果要启用跨子域登录

```bash
AUTH_COOKIE_DOMAIN=.muirpg.com
```

### 如果要启用 `llmproxy`

```bash
LLM_PROXY_UPSTREAM_BASE_URL=https://api.openai.com
LLM_PROXY_UPSTREAM_API_KEY=replace-me
LLM_PROXY_ALLOWED_MODELS=gpt-4.1-mini,gpt-4o-mini
```

### 仅在 `GAME_CREATION_MODE=opencode` 时需要

```bash
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_SERVER_USERNAME=opencode
OPENCODE_SERVER_PASSWORD=secret
```

### 启动命令

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/website build
pnpm --dir packages/website exec next start -p 3090
```

### 反向代理

将公网 `443` 反代到 `127.0.0.1:3090`。

## Play 部署

### 必需环境变量

```bash
PLAY_BASE_URL=https://play.muirpg.com
WEBSITE_BASE_URL=https://muirpg.com
INTERNAL_SERVICE_TOKEN=replace-me
PLAY_RUNTIME=opencode
PLAY_LLM_MODEL=gpt-4.1-mini
```

### 启动命令

```bash
pnpm install --frozen-lockfile
pnpm --dir packages/play build
pnpm --dir packages/play exec next start -p 3091
```

### 反向代理

将公网 `443` 反代到 `127.0.0.1:3091`。

## Nginx 示例

```nginx
server {
  server_name muirpg.com;

  location / {
    proxy_pass http://127.0.0.1:3090;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}

server {
  server_name play.muirpg.com;

  location / {
    proxy_pass http://127.0.0.1:3091;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## systemd 示例

### website

```ini
[Unit]
Description=MuirPG Website
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/muirpg/repo
EnvironmentFile=/srv/muirpg/repo/packages/website/.env.production
ExecStart=/usr/bin/env pnpm --dir packages/website exec next start -p 3090
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### play

```ini
[Unit]
Description=MuirPG Play
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/muirpg/repo
EnvironmentFile=/srv/muirpg/repo/packages/play/.env.production
ExecStart=/usr/bin/env pnpm --dir packages/play exec next start -p 3091
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

## 推荐部署顺序

1. 部署 `website`
2. 部署 `play`
3. 配置反向代理
4. 配置 `AUTH_COOKIE_DOMAIN`
5. 先用 `PLAY_RUNTIME=stub` 跑通主链路
6. 再切到 `PLAY_RUNTIME=opencode`

## 上线前检查

至少确认以下接口可用：

- `GET /api/session`
- `GET /api/modules`
- `POST /api/games`
- `GET /api/games/{id}`
- `POST /api/games/{id}/messages`（仅旧链路）
- `POST /api/internal/games/{id}/turn`
- `POST /api/llmproxy/v1/chat/completions`
- `GET play /api/session`
- `GET play /api/games/{id}`
- `POST play /api/games/{id}/messages`

## 常见问题

### 建局时报 `play 服务入口未配置`

你启用了 `GAME_CREATION_MODE=play`，但没有设置 `PLAY_BASE_URL`。

### play 侧报 `llmproxy 需要 INTERNAL_SERVICE_TOKEN`

`PLAY_RUNTIME=opencode` 时，play 必须带内部 token 调用 website `/api/llmproxy`。

### 登录成功但 play 侧仍未登录

通常是跨子域 cookie 配置不完整。检查：

- `APP_BASE_URL`
- `PLAY_BASE_URL`
- `AUTH_COOKIE_DOMAIN=.muirpg.com`
- 反向代理是否正确透传 `Host` 和 `X-Forwarded-Proto`

### website 旧消息接口返回 `当前游戏由 play 运行时托管，请前往游戏域继续`

这是预期行为，说明该 game 是 `GAME_CREATION_MODE=play` 创建的，后续消息应走 `play`。
