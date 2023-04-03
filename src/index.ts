import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';

import { getGithubClient } from './clients/github';
import { getSlackClient } from './clients/slack';
import { getSlackController } from './controllers/slack';
import { getGithubRepository } from './repositories/github';
import { getGithubService } from './services/github';
import { getLogService } from './services/log';
import { getSlackService } from './services/slack';

dotenv.config({ path: '.env.local' });

const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const slackTestChannelId = process.env.SLACK_TEST_CHANNEL_ID;
const slackActiveChannelId = process.env.SLACK_ACTIVE_CHANNEL_ID;
const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const githubAccessToken = process.env.GHP_ACCESS_TOKEN;

if (!slackAuthToken) throw new Error('Missint Slack Auth Token');
if (!slackBotToken) throw new Error('Missing Slack Bot Token');
if (!slackWatcherChannelId) throw new Error('Missing Slack Watcher Channel ID');
if (!slackTestChannelId) throw new Error('Missing Slack Test Channel ID');
if (!slackActiveChannelId) throw new Error('Missing Slack Active Channel ID');
if (!githubAccessToken) throw new Error('Missing Github Access Token');

const PORT = 3000;
const app = express();

// dependencies

const slackClient = getSlackClient({
  external: { slackAuthToken, slackWatcherChannelId, slackTestChannelId, slackActiveChannelId },
});
const githubClient = getGithubClient({ external: { githubAccessToken } });
const githubRepostitory = getGithubRepository({ clients: [githubClient] });
const logService = getLogService();
const githubService = getGithubService({ repositories: [githubRepostitory] });
const slackService = getSlackService({ clients: [slackClient], services: [logService, githubService] });
const slackController = getSlackController({ services: [slackService], external: { slackBotToken } });

// routes

app.post('/slack/action-endpoint', express.json(), (req, res) => slackController.handleEventRequest(req, res));

// Start the server & schedule cron jobs
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
cron.schedule('30 10 * * 1', () => slackService.sendGithubTopRepositoriesLastWeek());
