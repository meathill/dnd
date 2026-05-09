#!/usr/bin/env bash
# 在 VPS 上装 opencode + 跑 systemd 服务，把 agent-server 切到真实模式。
#
# 前置：先跑过 setup-vps.sh，agent-server 已经稳定。
#
# 流程：
#   1. npm install -g opencode-ai
#   2. 写 ~/.config/opencode/opencode.json（使用 worker 同款 LLM 上游）
#   3. systemd unit opencode.service（监听 127.0.0.1:4096）
#   4. 修改 agent-server 的 .env：OPENCODE_MODE=opencode
#   5. 重启 agent-server
#
# 提醒：opencode 需要 LLM API key，否则启动后 chat 会报错。
# 推荐传入和 worker 一样的 LLM_PROXY_UPSTREAM_API_KEY。

set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "请用普通用户跑（脚本内部会按需 sudo）" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKDIR="$(realpath "$SCRIPT_DIR/..")"
USER_NAME="$(whoami)"
ENV_FILE="$WORKDIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "未找到 $ENV_FILE，请先跑 setup-vps.sh" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. 装 opencode CLI
# ---------------------------------------------------------------------------

if ! command -v opencode &>/dev/null; then
  echo "==> 装 opencode-ai 全局包"
  sudo npm install -g opencode-ai
fi

echo "==> opencode 版本：$(opencode --version 2>&1 | head -1 || echo 未知)"

# ---------------------------------------------------------------------------
# 2. 准备 LLM 上游配置
# ---------------------------------------------------------------------------

if [[ -z "${LLM_PROXY_UPSTREAM_BASE_URL:-}" ]]; then
  read -rp "LLM 上游 base url（留空使用 https://token-plan-sgp.xiaomimimo.com）: " UPSTREAM_BASE
  UPSTREAM_BASE="${UPSTREAM_BASE:-https://token-plan-sgp.xiaomimimo.com}"
else
  UPSTREAM_BASE="$LLM_PROXY_UPSTREAM_BASE_URL"
fi

if [[ -z "${LLM_PROXY_UPSTREAM_API_KEY:-}" ]]; then
  read -rsp "LLM 上游 API key: " UPSTREAM_KEY
  echo
else
  UPSTREAM_KEY="$LLM_PROXY_UPSTREAM_API_KEY"
fi

if [[ -z "${OPENCODE_DEFAULT_MODEL:-}" ]]; then
  read -rp "opencode 默认模型（留空使用 mimo-v2.5-pro）: " OC_MODEL
  OC_MODEL="${OC_MODEL:-mimo-v2.5-pro}"
else
  OC_MODEL="$OPENCODE_DEFAULT_MODEL"
fi

CONFIG_DIR="$HOME/.config/opencode"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/opencode.json" <<EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "openai-compatible": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "MiMo",
      "options": {
        "baseURL": "$UPSTREAM_BASE/v1",
        "apiKey": "$UPSTREAM_KEY"
      },
      "models": {
        "$OC_MODEL": {}
      }
    }
  },
  "model": "openai-compatible/$OC_MODEL"
}
EOF
chmod 600 "$CONFIG_DIR/opencode.json"

# ---------------------------------------------------------------------------
# 3. 写 systemd unit for opencode
# ---------------------------------------------------------------------------

OC_PASSWORD="$(grep '^OPENCODE_SERVER_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
OC_BIN="$(command -v opencode)"

UNIT_PATH="/etc/systemd/system/opencode.service"
echo "==> 写 $UNIT_PATH"
sudo tee "$UNIT_PATH" > /dev/null <<EOF
[Unit]
Description=opencode serve
After=network.target

[Service]
Type=simple
User=$USER_NAME
Environment=OPENCODE_SERVER_PASSWORD=$OC_PASSWORD
Environment=OPENCODE_DISABLE_AUTOUPDATE=1
ExecStart=$OC_BIN serve --port 4096 --hostname 127.0.0.1
Restart=on-failure
RestartSec=5
MemoryMax=400M

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable opencode.service
sudo systemctl restart opencode.service

# ---------------------------------------------------------------------------
# 4. agent-server 切到 opencode 模式
# ---------------------------------------------------------------------------

if grep -q '^OPENCODE_MODE=' "$ENV_FILE"; then
  sed -i 's/^OPENCODE_MODE=.*/OPENCODE_MODE=opencode/' "$ENV_FILE"
else
  echo 'OPENCODE_MODE=opencode' >> "$ENV_FILE"
fi

sudo systemctl restart agent-server.service

# ---------------------------------------------------------------------------
# 5. 验证
# ---------------------------------------------------------------------------

sleep 5
echo
echo "==================================================================="
echo "==> opencode status"
systemctl status opencode.service --no-pager | head -10 || true
echo
echo "==> opencode healthz"
if curl -sf -H "x-opencode-password: $OC_PASSWORD" http://127.0.0.1:4096/doc 2>&1 | head -1 | grep -q -i 'openapi\|json'; then
  echo "✅ opencode serve 应答正常"
else
  echo "⚠️  opencode 可能还在启动，过几秒看 journalctl -u opencode -f"
fi

echo
echo "==> agent-server healthz"
curl -sf http://127.0.0.1:4180/healthz && echo
echo
echo "完成。下一步：在本地仓库 wrangler.jsonc 部署 worker（OPENCODE_AGENT_BASE_URL 已经指向 https 反代）"
