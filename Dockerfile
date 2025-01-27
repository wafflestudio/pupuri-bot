FROM oven/bun:1.2.0-slim

WORKDIR /app

ARG SLACK_BOT_TOKEN
ARG SLACK_AUTH_TOKEN
ARG SLACK_WATCHER_CHANNEL_ID
ARG DEPLOY_WATCHER_CHANNEL_ID
ARG OPENAI_API_KEY
ARG MONGODB_URI

COPY package.json bunfig.toml bun.lockb tsconfig.json ./
COPY src ./src
RUN bun install --production

RUN echo "SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}" >> .env.local
RUN echo "SLACK_AUTH_TOKEN=${SLACK_AUTH_TOKEN}" >> .env.local
RUN echo "SLACK_WATCHER_CHANNEL_ID=${SLACK_WATCHER_CHANNEL_ID}" >> .env.local
RUN echo "DEPLOY_WATCHER_CHANNEL_ID=${DEPLOY_WATCHER_CHANNEL_ID}" >> .env.local
RUN echo "OPENAI_API_KEY=${OPENAI_API_KEY}" >> .env.local
RUN echo "MONGODB_URI=${MONGODB_URI}" >> .env.local

EXPOSE 3000

CMD ["bun", "start:server"]
