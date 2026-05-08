# 测试指南

当前仓库的验证目标不是单一前端页面，而是：

1. `website` 控制面
2. 主站内统一游戏运行时
3. 模型调用与回合持久化链路

## 安装依赖

```bash
pnpm install
```

## 代码格式与 lint

仓库当前使用 Biome。

检查：

```bash
pnpm lint
pnpm format:check
```

自动格式化：

```bash
pnpm format
```

## Typecheck

```bash
pnpm typecheck
```

也可以单独执行：

```bash
pnpm --dir packages/website typecheck
```

## 单元测试

```bash
pnpm test
```

也可以单独执行：

```bash
pnpm --dir packages/website test
```

## 构建验证

```bash
pnpm build
```

也可以单独执行：

```bash
pnpm --dir packages/website build
```

## 推荐完整回归命令

部署前至少执行一次：

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build
```

## 覆盖范围

### website

当前已覆盖的关键点：

- 建局接口
- 统一游戏消息接口
- `GAME_RUNTIME=stub` / `GAME_RUNTIME=opencode` 分支
- 游戏上下文读取
- 上游模型调用 helper
- 仓储层原子回合写入

## 端到端 smoke

当前仓库没有正式纳入 CI 的 e2e 测试框架，但已经验证过一条真实 smoke：

`注册登录 -> website 建局 -> 进入 /games/[id] -> 发消息 -> 落库扣费`

建议部署测试时按两阶段执行：

### 阶段 1：最小联调

- `website`: `GAME_RUNTIME=stub`

验证：

- 登录
- 建局
- 进入 `/games/{id}`
- 发消息后余额减少
- 刷新后仍能看到消息记录

### 阶段 2：完整模型联调

- `website`: `GAME_RUNTIME=opencode`

额外验证：

- assistant message meta 中带有 `providerId` / `modelId` / `tokens`

## 测试约定

- 使用 Vitest
- 测试文件采用 `*.test.ts(x)`
- 路由测试优先 mock 外部依赖，不依赖真实第三方服务
- 仓储层测试允许使用临时 SQLite 文件验证真实读写

## 当前限制

- 当前没有正式 E2E 测试框架
- 当前没有 CI 流水线定义
- 本地自动化测试当前仍以 Node.js + SQLite 文件为主；Cloudflare D1 / Workers 需补部署后 smoke

## Cloudflare 验证

如果刚改过 `wrangler.jsonc`，先同步更新类型再跑 `typecheck`：

```bash
pnpm --dir packages/website exec wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts
```

部署到 Cloudflare Workers 后，至少补做一轮 smoke：

- `muirpg.meathill.com` 能登录并建局
- `muirpg.meathill.com/games/{gameId}` 能正常进入游戏
- `i.muirpg.meathill.com` 能作为静态资产域被引用
- 游戏消息提交后能正常落库到 D1 并扣费
