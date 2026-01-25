# 测试指南

## 前端（packages/website）

- 安装依赖：`pnpm install`
- 运行单测：`pnpm --filter ./packages/website test`
- 监听模式：`pnpm --filter ./packages/website test:watch`

## 约定

- 使用 Vitest + React Testing Library
- 测试文件放在 `packages/website/src` 下的 `__tests__` 目录或 `*.test.ts(x)` 命名
- API 路由测试放在 `packages/website/src/app/api/__tests__`，通过 mock `getAuth` / `getDatabase` / repositories，避免依赖真实 D1
