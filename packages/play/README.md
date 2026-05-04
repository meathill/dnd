# 肉团长 Play

独立游戏运行时，目标域名为 `play.muirpg.com`。

当前支持三种 runtime：

1. `stub`：不依赖 opencode，适合独立测试 API
2. `website`：将聊天请求转发给 website
3. `opencode`：预留给后续直接接 opencode runtime

## 环境变量

```bash
PLAY_BASE_URL=https://play.muirpg.com
WEBSITE_BASE_URL=https://muirpg.com
INTERNAL_SERVICE_TOKEN=replace-me
PLAY_RUNTIME=stub
```

## 开发

```bash
pnpm dev
```
