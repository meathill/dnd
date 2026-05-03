# 肉团长 Website

新版网站负责：

1. 登录与会话
2. 从数据库读取模组列表与模组摘要
3. 创建游戏并绑定 `opencode session`
4. 转发游戏消息并按回合扣费

## 环境变量

```bash
BETTER_AUTH_SECRET=change-me
OPENCODE_BASE_URL=http://127.0.0.1:4096
OPENCODE_SERVER_USERNAME=opencode
OPENCODE_SERVER_PASSWORD=secret
OPENCODE_WORKSPACE_ROOT=/path/to/workspace
DATABASE_URL=/absolute/path/to/website.sqlite
```

不设置 `DATABASE_URL` 时，默认使用 `packages/website/.local/website.sqlite`。

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
