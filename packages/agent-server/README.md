# @dnd/agent-server

部署在 VPS 上的 agent runner，负责：

1. 维护每个创作 / 游戏会话的 workspace 目录与生命周期
2. 接收 website 的 HTTP 请求，转发给同一台机器上的 `opencode serve` 跑 agent loop
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
| `HOSTNAME` | 默认 `127.0.0.1`（VPS 本地，由 cloudflared 反代到公网） |
| `AGENT_WORKSPACE_ROOT` | session workspace 根目录（systemd 部署时由 unit 注入） |
| `AGENT_SKILLS_DIR` | skills 模板目录（创建 session 时复制到 workspace 的 `.opencode/skills/`） |
| `OPENCODE_MODE` | `stub` \| `opencode`。stub 时只返回占位回复，方便 website 端联调 |
| `OPENCODE_BASE_URL` | opencode serve 地址，默认 `http://127.0.0.1:4096` |
| `OPENCODE_SERVER_PASSWORD` | opencode serve 的鉴权密码 |

## VPS 部署（推荐：systemd，不依赖 docker）

适合 1-2GB 内存的小机器。两条命令搞定：

```bash
# 1) clone 仓库（如果还没 clone）
git clone https://github.com/meathill/dnd.git ~/dnd

# 2) 跑部署脚本
cd ~/dnd/packages/agent-server
bash scripts/setup-vps.sh
```

脚本会：
- 加 1GB swap（防 OOM）
- 装 Node.js 24（NodeSource）
- 启用 corepack + pnpm
- `pnpm install --filter @dnd/agent-server`
- 生成 `.env`（带随机 token）
- 写 systemd unit `agent-server.service` 并启动（端口 4180，限制 350MB 内存）
- 顺手禁用 snapd / docker（如果在跑且没在用）

跑完后自动 `curl /healthz` 验证，并打印 `AGENT_SERVER_TOKEN`，把它推到 Cloudflare Worker secret：

```bash
# 本地仓库，把上面打印的 token 推上去
pnpm --dir packages/website exec wrangler secret put OPENCODE_AGENT_TOKEN
```

把 cloudflared ingress 指向 4180（如果原来已经有 `opencode.muirpg.meathill.com -> 127.0.0.1:4096`）：

```bash
# 在 VPS 上
sudo sed -i 's|127.0.0.1:4096|127.0.0.1:4180|' /etc/cloudflared/config.yml
sudo systemctl restart cloudflared
curl https://opencode.muirpg.meathill.com/healthz   # {"ok":true,"opencodeMode":"stub"}
```

最后在 `packages/website/wrangler.jsonc` 把 `OPENCODE_AGENT_BASE_URL` 改成对应 https 域名，重新部署 worker。

### 接 opencode 真实模式

`setup-vps.sh` 把 agent-server 跑在 `OPENCODE_MODE=stub`。要切到真实 LLM 调用：

**方式 1：先把 key 填进 `.env`，然后跑脚本（推荐）**

```bash
cd ~/dnd/packages/agent-server
nano .env
# 把 LLM_PROXY_UPSTREAM_API_KEY=<your-key> 填上
# （LLM_PROXY_UPSTREAM_BASE_URL / OPENCODE_DEFAULT_MODEL 已有默认值，按需改）

bash scripts/install-opencode.sh
```

**方式 2：临时通过环境变量注入**

```bash
LLM_PROXY_UPSTREAM_API_KEY=<your-key> bash scripts/install-opencode.sh
```

脚本逻辑：

1. `source .env` 加载现有值
2. 任一缺失的字段（`LLM_PROXY_UPSTREAM_BASE_URL` / `LLM_PROXY_UPSTREAM_API_KEY` / `OPENCODE_DEFAULT_MODEL`）会 prompt
3. **prompt 输入的值会回写到 `.env`**，重跑脚本不需要再次输入
4. 装 `opencode-ai`、写 `~/.config/opencode/opencode.json`、起 `opencode.service`
5. 把 agent-server 切到 `OPENCODE_MODE=opencode` 并重启

`.env` 是 chmod 600 的；不要把它 commit 到 git。

## 本地开发（docker）

`docker-compose.yml` 仍然保留，但仅用于本地开发。生产部署用上面的 systemd 方案。

```bash
cd packages/agent-server
cat > .env <<EOF
AGENT_SERVER_TOKEN=dev-token
OPENCODE_SERVER_PASSWORD=dev-password
OPENCODE_MODE=stub
EOF
docker compose up -d agent-server
curl -H "Authorization: Bearer dev-token" http://127.0.0.1:4180/healthz
```

## 设计要点

- Session store 当前只在内存里。重启会丢失 sessionId 索引；workspace 文件本身不会丢。后续要持久化时可以换成 sqlite。
- skills 模板按 opencode 约定复制到每个 session workspace 的 `.opencode/skills/`。修改了仓库的 `skills/`，重启 agent-server 即可（systemd 重启）。
- workspace 目录约定：
  - `<root>/sessions/<sessionId>/` 创作 / 游戏会话工作目录
  - `<root>/published/<moduleId>/` 发布后的模组目录（玩家开始游戏时由 website worker 拉取）
- systemd unit 限制单进程最大 350MB 内存（`MemoryMax=350M`），避免在小内存机器上拖垮整个系统。
