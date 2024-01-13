import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';

import { implementDashboardService } from './infrastructures/implementDashboardService';
import { implementGithubApiRepository } from './infrastructures/implementGithubApiRepository';
import { implementGithubHttpClient } from './infrastructures/implementGithubHttpClient';
import { implementSlackEventService } from './infrastructures/implementSlackEventService';
import { implementSlackHttpClient } from './infrastructures/implementSlackHttpClient';

dotenv.config({ path: '.env.local' });

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const githubAccessToken = process.env.GHP_ACCESS_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const slackActiveChannelId = process.env.SLACK_ACTIVE_CHANNEL_ID;

if (!slackAuthToken) throw new Error('Missint Slack Auth Token');
if (!slackBotToken) throw new Error('Missing Slack Bot Token');
if (!githubAccessToken) throw new Error('Missing Github Access Token');
if (!slackWatcherChannelId) throw new Error('Missing Slack Watcher Channel ID');
if (!slackActiveChannelId) throw new Error('Missing Slack Active Channel ID');

const PORT = 3000;
const app = express();

/**
██████╗ ███████╗██████╗ ███████╗███╗   ██╗██████╗ ███████╗███╗   ██╗ ██████╗██╗███████╗███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔════╝██╔════╝
██║  ██║█████╗  ██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ██╔██╗ ██║██║     ██║█████╗  ███████╗
██║  ██║██╔══╝  ██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║╚██╗██║██║     ██║██╔══╝  ╚════██║
██████╔╝███████╗██║     ███████╗██║ ╚████║██████╔╝███████╗██║ ╚████║╚██████╗██║███████╗███████║
╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝╚══════╝                                    
 */
const slackClient = implementSlackHttpClient({
  external: { slackAuthToken },
  channelIds: {
    'slack-watcher': slackWatcherChannelId,
    active: slackActiveChannelId,
  },
});
const githubClient = implementGithubHttpClient({ githubAccessToken });
const githubApiRepository = implementGithubApiRepository({ githubClient });
const dashboardService = implementDashboardService({ githubApiRepository, slackClient });
const slackService = implementSlackEventService({ slackClient });

/**
██████╗ ███████╗ ██████╗██╗      █████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝
██║  ██║█████╗  ██║     ██║     ███████║██████╔╝█████╗  
██║  ██║██╔══╝  ██║     ██║     ██╔══██║██╔══██╗██╔══╝  
██████╔╝███████╗╚██████╗███████╗██║  ██║██║  ██║███████╗
╚═════╝ ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 */

cron.schedule('0 3 * * 1', () => dashboardService.sendGithubTopRepositoriesLastWeek('wafflestudio'));
app.post('/slack/action-endpoint', express.json(), (req, res) => {
  try {
    if (req.body.token !== slackBotToken) throw new Error('403');

    // Slack event subscription verification
    if (req.body.type === 'url_verification') return res.status(200).send(slackService.handleVerification(req.body));

    return res.status(200).send(slackService.handleEvent(req.body.event));
  } catch (err) {
    if (!err || typeof err !== 'object' || !('message' in err)) return res.sendStatus(500);
    const errCode = Number(err.message);
    if (isNaN(errCode)) return res.sendStatus(500);
    res.sendStatus(errCode);
  }
});

/**
███████╗████████╗ █████╗ ██████╗ ████████╗
██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝
███████╗   ██║   ███████║██████╔╝   ██║   
╚════██║   ██║   ██╔══██║██╔══██╗   ██║   
███████║   ██║   ██║  ██║██║  ██║   ██║   
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
 */
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
