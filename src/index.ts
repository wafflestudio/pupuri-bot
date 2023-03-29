import dotenv from 'dotenv';
import express from 'express';
import { getSlackClient } from './clients/slack';
import { getSlackController } from './controllers/slack';
import { getLogService } from './services/log';
import { getSlackService } from './services/slack';

dotenv.config({ path: '.env.local' });

const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const slackTestChannelId = process.env.SLACK_TEST_CHANNEL_ID;
const slackAuthToken = process.env.SLACK_AUTH_TOKEN;

if (!slackAuthToken || !slackWatcherChannelId || !slackTestChannelId || !slackBotToken)
  throw new Error('Missing env vars');

const PORT = 3000;
const app = express();

const slackClient = getSlackClient({ external: { slackAuthToken, slackWatcherChannelId, slackTestChannelId } });

const logService = getLogService();
const slackService = getSlackService({ clients: [slackClient], services: [logService] });

const slackController = getSlackController({ services: [slackService], external: { slackBotToken } });

app.post('/slack/action-endpoint', express.json(), (req, res) => slackController.handleEventRequest(req, res));

// Start the server
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
