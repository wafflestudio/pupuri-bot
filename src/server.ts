import { WebClient } from '@slack/web-api';
import { MongoClient, ServerApiVersion } from 'mongodb';
import OpenAI from 'openai';
import { handle } from './main';

const PORT = 3000;

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const deployWatcherChannelId = process.env.DEPLOY_WATCHER_CHANNEL_ID;
const openaiApiKey = process.env.OPENAI_API_KEY;
const mongoDBUri = process.env.MONGODB_URI;

if (slackAuthToken === undefined) throw new Error('Missing Slack Auth Token');
if (slackBotToken === undefined) throw new Error('Missing Slack Bot Token');
if (slackWatcherChannelId === undefined) throw new Error('Missing Slack Watcher Channel ID');
if (deployWatcherChannelId === undefined) throw new Error('Missing Deploy Watcher Channel ID');
if (openaiApiKey === undefined) throw new Error('Missing OpenAI API Key');
if (mongoDBUri === undefined) throw new Error('Missing MongoDB URI');

const mongoClient = new MongoClient(mongoDBUri, { serverApi: ServerApiVersion.v1 });

mongoClient.connect();

process.on('exit', () => {
  mongoClient.close();
});

Bun.serve({
  port: PORT,
  fetch(req) {
    return handle(
      {
        slackClient: new WebClient(slackAuthToken).chat,
        openaiClient: new OpenAI({ apiKey: openaiApiKey }).chat.completions,
        mongoClient,
        wadotClient: {
          listUsers: () =>
            fetch('https://wadot-api.wafflestudio.com/api/v1/users').then(
              (res) => res.json() as Promise<{ github_id: string; slack_id: string }[]>,
            ),
        },
      },
      {
        slackBotToken,
        slackWatcherChannelId,
        deployWatcherChannelId,
        NODE_ENV: process.env.NODE_ENV as 'production' | 'development' | 'test' | undefined,
      },
      req,
    );
  },
});

console.info(`Listening on port ${PORT}`);
