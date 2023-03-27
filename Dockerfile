FROM node:18.11.0-alpine
ARG SLACK_BOT_TOKEN
COPY . .
RUN echo "SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}" >> .env.local
RUN echo "SLACK_AUTH_TOKEN=${SLACK_AUTH_TOKEN}" >> .env.local
RUN echo "SLACK_WATCHER_CHANNEL_ID=${SLACK_WATCHER_CHANNEL_ID}" >> .env.local
RUN yarn install
RUN yarn build
CMD ["yarn", "start"]

EXPOSE 3000
