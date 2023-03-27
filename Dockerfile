FROM node:18.11.0-alpine
ARG SLACK_SIGNING_SECRET
COPY . .
RUN echo "SLACK_SIGNING_SECRET=${SLACK_SIGNING_SECRET}" >> .env.local
RUN yarn install
RUN yarn build
CMD ["yarn", "start"]

EXPOSE 3000
