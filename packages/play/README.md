# 肉团长 Play

独立游戏运行时，目标域名为 `play.muirpg.com`。

当前支持三种 runtime：

1. `stub`：不依赖 opencode，适合独立测试 API
2. `website`：将聊天请求转发给 website
3. `opencode`：由 play 直接通过 website `llmproxy` 请求模型，再统一回写 website

## 环境变量

```bash
PLAY_BASE_URL=https://play.muirpg.com
WEBSITE_BASE_URL=https://muirpg.com
INTERNAL_SERVICE_TOKEN=replace-me
PLAY_LLM_MODEL=gpt-4.1-mini
PLAY_RUNTIME=stub
```

## Runtime 说明

### `PLAY_RUNTIME=stub`

- 不请求真实模型
- 仍然会通过 website internal turn 接口落库、扣费、写账本
- 适合验证 play API、鉴权、持久化与前端 UI

### `PLAY_RUNTIME=website`

- 直接转发给 website 现有 `/api/games/[id]/messages`
- 主要用于兼容 website 旧消息链路

### `PLAY_RUNTIME=opencode`

- play 直接调用 website `/api/llmproxy/v1/chat/completions`
- 拿到回复后通过 internal turn 接口统一写回 website
- 需要 `INTERNAL_SERVICE_TOKEN` 与 website 保持一致
- website 侧还需要配置 `LLM_PROXY_*`

## 推荐组合

本地完整联调推荐：

- website: `GAME_CREATION_MODE=play`
- play: `PLAY_RUNTIME=opencode`

如果只是验证 play 自身页面和消息链路，不想引入真实模型，可改成：

- website: `GAME_CREATION_MODE=play`
- play: `PLAY_RUNTIME=stub`

## 开发

```bash
pnpm dev
```
