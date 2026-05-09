# 基于官方 node:24，原生支持 .ts 直接执行
FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/usr/local/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

WORKDIR /app

# 拷贝 monorepo 配置（pnpm-workspace 解析需要）
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 只装 agent-server 这个 package 的依赖
COPY packages/agent-server/package.json packages/agent-server/
RUN pnpm --filter @dnd/agent-server install --frozen-lockfile

# 拷贝源码
COPY packages/agent-server packages/agent-server
COPY skills /var/agent/skills

ENV NODE_ENV=production
ENV PORT=4180
ENV AGENT_WORKSPACE_ROOT=/var/agent/workspace
ENV AGENT_SKILLS_DIR=/var/agent/skills

EXPOSE 4180

CMD ["pnpm", "--filter", "@dnd/agent-server", "start"]
