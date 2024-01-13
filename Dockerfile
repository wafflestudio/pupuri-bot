FROM node:18.17.1-alpine
ARG SLACK_BOT_TOKEN
ARG SLACK_AUTH_TOKEN
ARG SLACK_WATCHER_CHANNEL_ID
COPY . .
RUN echo "SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}" >> .env.local
RUN echo "SLACK_AUTH_TOKEN=${SLACK_AUTH_TOKEN}" >> .env.local
RUN echo "SLACK_WATCHER_CHANNEL_ID=${SLACK_WATCHER_CHANNEL_ID}" >> .env.local
RUN yarn install
RUN yarn build:server
CMD ["yarn", "start:server"]

EXPOSE 3000
