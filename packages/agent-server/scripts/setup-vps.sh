#!/usr/bin/env bash
# 在 VPS 上一次性部署 @dnd/agent-server。systemd 模式，不依赖 docker。
#
# 用法（在 VPS 上）：
#   cd ~/dnd/packages/agent-server
#   bash scripts/setup-vps.sh
#
# 适用场景：内存紧张（< 2GB）、不希望跑 docker 的情况。
# 本脚本会：
#   1. 加 1GB swap（如果还没加过）
#   2. 装 Node.js 24（NodeSource apt 源）
#   3. 启用 corepack + pnpm
#   4. pnpm install 安装依赖
#   5. 生成 .env（如果不存在）
#   6. 写 systemd unit 并启动
#   7. 顺手禁掉占内存的 snapd / docker（如果没在用）
#
# 设计原则：
#   - 幂等：重复跑不出错
#   - 不删数据：.env 只在不存在时生成
#   - 失败时输出明确信息

set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "请用普通用户跑（脚本内部会按需 sudo）" >&2
  exit 1
fi

if [[ ! -f "$(dirname "${BASH_SOURCE[0]}")/../package.json" ]]; then
  echo "未找到 package.json，请在 packages/agent-server/ 下运行" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(realpath "$SCRIPT_DIR/..")"
REPO_ROOT="$(realpath "$WORKDIR/../..")"
USER_NAME="$(whoami)"
SERVICE_NAME="agent-server.service"

echo "==> repo root: $REPO_ROOT"
echo "==> agent-server: $WORKDIR"
echo "==> user: $USER_NAME"

# ---------------------------------------------------------------------------
# 1. 加 swap（防止 OOM）
# ---------------------------------------------------------------------------

if ! sudo swapon --show 2>/dev/null | grep -q '/swapfile'; then
  echo "==> 加 1GB swap"
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
else
  echo "==> swap 已存在，跳过"
fi

# ---------------------------------------------------------------------------
# 2. 关掉占内存但用不到的 snapd / docker（如果存在）
# ---------------------------------------------------------------------------

for unit in snapd.service snapd.socket docker.service docker.socket containerd.service; do
  if systemctl list-unit-files "$unit" 2>/dev/null | grep -q "$unit"; then
    if systemctl is-enabled --quiet "$unit" 2>/dev/null; then
      echo "==> 禁用 $unit（节省内存）"
      sudo systemctl stop "$unit" 2>/dev/null || true
      sudo systemctl disable "$unit" 2>/dev/null || true
    fi
  fi
done

# ---------------------------------------------------------------------------
# 3. 装 Node.js 24
# ---------------------------------------------------------------------------

NEED_NODE=1
if command -v node &>/dev/null; then
  NODE_MAJOR="$(node -v | sed -E 's/v([0-9]+).*/\1/')"
  if [[ "$NODE_MAJOR" -ge 24 ]]; then
    NEED_NODE=0
  fi
fi

if [[ "$NEED_NODE" -eq 1 ]]; then
  echo "==> 装 Node.js 24（NodeSource）"
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "==> Node 版本：$(node -v)"

# ---------------------------------------------------------------------------
# 4. 启用 corepack + pnpm
# ---------------------------------------------------------------------------

if ! command -v pnpm &>/dev/null; then
  echo "==> 启用 corepack + pnpm"
  sudo corepack enable
fi

# 确保是项目要求的版本
sudo corepack prepare pnpm@10.28.1 --activate

# ---------------------------------------------------------------------------
# 5. 安装依赖
# ---------------------------------------------------------------------------

echo "==> pnpm install --filter @dnd/agent-server"
cd "$REPO_ROOT"
pnpm install --filter @dnd/agent-server --frozen-lockfile

# ---------------------------------------------------------------------------
# 6. 生成 .env（仅当不存在时）
# ---------------------------------------------------------------------------

ENV_FILE="$WORKDIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> 生成 .env"
  cat > "$ENV_FILE" <<EOF
AGENT_SERVER_TOKEN=$(openssl rand -hex 32)
OPENCODE_SERVER_PASSWORD=$(openssl rand -hex 32)
OPENCODE_MODE=stub
OPENCODE_BASE_URL=http://127.0.0.1:4096
PORT=4180
HOSTNAME=127.0.0.1
EOF
  chmod 600 "$ENV_FILE"
else
  echo "==> .env 已存在，跳过生成"
fi

# ---------------------------------------------------------------------------
# 7. 安装 systemd unit
# ---------------------------------------------------------------------------

WORKSPACE_DIR="$WORKDIR/.workspace"
mkdir -p "$WORKSPACE_DIR"

NODE_BIN="$(command -v node)"

UNIT_PATH="/etc/systemd/system/$SERVICE_NAME"
echo "==> 写 $UNIT_PATH"
sudo tee "$UNIT_PATH" > /dev/null <<EOF
[Unit]
Description=dnd agent-server
After=network.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$WORKDIR
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=production
Environment=AGENT_WORKSPACE_ROOT=$WORKSPACE_DIR
Environment=AGENT_SKILLS_DIR=$REPO_ROOT/skills
ExecStart=$NODE_BIN --experimental-strip-types --no-warnings src/server.ts
Restart=on-failure
RestartSec=3
# 限制最大内存，避免单进程拖垮整机
MemoryMax=350M

# 简单加固
NoNewPrivileges=yes
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=$WORKSPACE_DIR

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

# ---------------------------------------------------------------------------
# 8. 验证
# ---------------------------------------------------------------------------

sleep 3
echo
echo "==================================================================="
echo "==> systemctl status $SERVICE_NAME"
systemctl status "$SERVICE_NAME" --no-pager | head -12 || true
echo
echo "==> curl http://127.0.0.1:4180/healthz"
if curl -sf http://127.0.0.1:4180/healthz; then
  echo
  echo
  echo "✅ agent-server 已就绪。"
else
  echo "❌ healthz 没响应。看 journalctl -u $SERVICE_NAME -n 50 --no-pager 排查"
  exit 1
fi

echo
echo "==> AGENT_SERVER_TOKEN（推到 Cloudflare Worker 用）："
grep AGENT_SERVER_TOKEN "$ENV_FILE"
echo
echo "下一步："
echo "  1. 改 cloudflared config 把 opencode.muirpg... 指向 127.0.0.1:4180"
echo "     sudo sed -i 's|127.0.0.1:4096|127.0.0.1:4180|' /etc/cloudflared/config.yml"
echo "     sudo systemctl restart cloudflared"
echo "     curl https://opencode.muirpg.meathill.com/healthz"
echo "  2. 在本地仓库改 wrangler.jsonc 的 OPENCODE_AGENT_BASE_URL，并："
echo "     pnpm --dir packages/website exec wrangler secret put OPENCODE_AGENT_TOKEN"
echo "  3. 接 opencode 真实模式：bash scripts/install-opencode.sh"
