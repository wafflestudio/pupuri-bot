import { WebClient } from '@slack/web-api';
import { getTruffleClient } from '@wafflestudio/truffle-bunjs';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { z } from 'zod';
import { handle } from './main';

const PORT = 3000;

const truffleApiKey = process.env.TRUFFLE_API_KEY;
const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const deployWatcherChannelId = process.env.DEPLOY_WATCHER_CHANNEL_ID;
const mongoDBUri = process.env.MONGODB_URI;
const NODE_ENV = z.enum(['production', 'development', 'test']).parse(process.env.NODE_ENV);

if (truffleApiKey === undefined) throw new Error('Missing Truffle API Key');
if (slackAuthToken === undefined) throw new Error('Missing Slack Auth Token');
if (slackBotToken === undefined) throw new Error('Missing Slack Bot Token');
if (slackWatcherChannelId === undefined) throw new Error('Missing Slack Watcher Channel ID');
if (deployWatcherChannelId === undefined) throw new Error('Missing Deploy Watcher Channel ID');
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
        mongoClient,
        wadotClient: {
          listUsers: () =>
            fetch('https://wadot-api.wafflestudio.com/api/v1/users').then(
              (res) =>
                res.json() as Promise<
                  { github_id: string; slack_id: string; first_name: string }[]
                >,
            ),
        },
        truffleClient: getTruffleClient({
          app: { name: 'pupuri-bot', phase: 'prod' },
          enabled: NODE_ENV === 'production',
          apiKey: truffleApiKey,
        }),
      },
      { slackBotToken, slackWatcherChannelId, deployWatcherChannelId, NODE_ENV },
      req,
    );
  },
});

console.info(`Listening on port ${PORT}`);
