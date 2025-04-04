FROM oven/bun:1.2.0-slim as builder

WORKDIR /app

COPY . .
RUN bun install
RUN bun build:server

FROM oven/bun:1.2.0-slim as runner

WORKDIR /app

ARG SLACK_BOT_TOKEN
ARG SLACK_AUTH_TOKEN
ARG SLACK_WATCHER_CHANNEL_ID
ARG DEPLOY_WATCHER_CHANNEL_ID
ARG MONGODB_URI
ARG TRUFFLE_API_KEY

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json

RUN echo "SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}" >> .env.local
RUN echo "SLACK_AUTH_TOKEN=${SLACK_AUTH_TOKEN}" >> .env.local
RUN echo "SLACK_WATCHER_CHANNEL_ID=${SLACK_WATCHER_CHANNEL_ID}" >> .env.local
RUN echo "DEPLOY_WATCHER_CHANNEL_ID=${DEPLOY_WATCHER_CHANNEL_ID}" >> .env.local
RUN echo "MONGODB_URI=${MONGODB_URI}" >> .env.local
RUN echo "TRUFFLE_API_KEY=${TRUFFLE_API_KEY}" >> .env.local

EXPOSE 3000

CMD ["bun", "start:server"]
