FROM node:18.11.0-alpine
COPY . .
RUN yarn install
RUN yarn build
CMD ["yarn", "start"]

EXPOSE 3000
