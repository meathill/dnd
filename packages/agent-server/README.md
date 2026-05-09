# @dnd/agent-server

部署在 VPS 上的 agent runner，负责：

1. 维护每个创作 / 游戏会话的 workspace 目录与生命周期
2. 接收 website 的 HTTP 请求，转发给 `opencode serve` 真正跑 agent loop
3. 把 skill 调用、最终的 module data 同步给 website

## 接口契约

- `POST /sessions` 创建 session（写工作区目录、复制 skills 模板、可选写入 meta.json / 模组初始数据）
- `GET /sessions/:id` 查 session + 历史消息
- `POST /sessions/:id/messages` 发消息，返回 user + assistant 双消息（含 skill 调用记录）
- `GET /sessions/:id/data?moduleSlug=xxx` 拉取当前 workspace 中的 module JSON（发布时由 worker 调用）
- `POST /sessions/:id/publish` 把 session workspace 复制到 published 目录、关闭 session
- `GET /healthz` 健康检查（无需鉴权）

所有非 healthz 请求都需要 `Authorization: Bearer <AGENT_SERVER_TOKEN>`。

## 环境变量

| 变量 | 说明 |
|------|------|
| `AGENT_SERVER_TOKEN` | 必填，与 website worker 共享 |
| `PORT` | 监听端口，默认 `4180` |
| `HOSTNAME` | 默认 `0.0.0.0` |
| `AGENT_WORKSPACE_ROOT` | session workspace 根目录，默认 `/var/agent/workspace` |
| `AGENT_SKILLS_DIR` | skills 模板目录（创建 session 时复制到 workspace 的 `.opencode/skills/`），默认 `/var/agent/skills` |
| `OPENCODE_MODE` | `stub` \| `opencode`。stub 时只返回占位回复，方便 website 端联调 |
| `OPENCODE_BASE_URL` | opencode serve 地址，默认 `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_PASSWORD` | opencode serve 的鉴权密码 |

## 本地运行（stub 模式）

```bash
AGENT_SERVER_TOKEN=dev-token \
AGENT_WORKSPACE_ROOT=$PWD/.workspace \
AGENT_SKILLS_DIR=$PWD/../../skills \
OPENCODE_MODE=stub \
pnpm --filter @dnd/agent-server dev
```

之后用 curl 验证：

```bash
curl -H "Authorization: Bearer dev-token" \
     -H "Content-Type: application/json" \
     -d '{"scenario":"authoring","ownerId":"u1","externalRef":"d1","moduleSlug":"haunted-mansion"}' \
     http://127.0.0.1:4180/sessions
```

## VPS 部署（docker compose）

`docker-compose.yml` 已包含 opencode + agent-server 两个服务。在 VPS 上：

```bash
git clone https://github.com/meathill/dnd.git
cd dnd/packages/agent-server
echo "AGENT_SERVER_TOKEN=<32 位随机串>" > .env
echo "OPENCODE_SERVER_PASSWORD=<另一个 32 位随机串>" >> .env
docker compose up -d
```

之后在 Cloudflare Worker 的 `wrangler.jsonc` 配置：

```jsonc
"vars": {
  "OPENCODE_AGENT_BASE_URL": "https://agent.your-vps.com"
},
"secrets": {
  "OPENCODE_AGENT_TOKEN": "<同上的 AGENT_SERVER_TOKEN>"
}
```

VPS 前置加 nginx / Caddy 做 TLS。

## 设计要点

- Session store 当前只在内存里。重启会丢失 sessionId 索引；workspace 文件本身不会丢。后续要持久化时可以换成 sqlite。
- skills 模板按 opencode 约定复制到每个 session workspace 的 `.opencode/skills/`。修改了仓库的 `skills/`，重新构建镜像即可。
- workspace 目录约定：
  - `<root>/sessions/<sessionId>/` 创作 / 游戏会话工作目录
  - `<root>/published/<moduleId>/` 发布后的模组目录（玩家开始游戏时由 website worker 拉取）
