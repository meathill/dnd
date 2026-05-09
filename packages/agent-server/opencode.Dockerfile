# SST 还没发布 opencode 官方 docker image，自己基于 node:24 装一份。
# 完整体积 ~250MB，启动后跑 opencode serve。
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl git \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g opencode-ai

ENV OPENCODE_DISABLE_AUTOUPDATE=1
WORKDIR /workspace

EXPOSE 4096
