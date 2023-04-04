import dotenv from 'dotenv';
import express from 'express';
import cron from 'node-cron';

import { getGithubClient } from './clients/github';
import { getSlackClient } from './clients/slack';
import { getDashboardController } from './controllers/dashboard';
import { getSlackController } from './controllers/slack';
import { getGithubRepository } from './repositories/github';
import { getDashboardService } from './services/dashboard';
import { getLogService } from './services/log';
import { getSlackService } from './services/slack';

dotenv.config({ path: '.env.local' });

const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const githubAccessToken = process.env.GHP_ACCESS_TOKEN;

// dev 환경일 경우 모두 test 로만 보내기
const slackTestChannelId = process.env.SLACK_TEST_CHANNEL_ID;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const slackActiveChannelId = process.env.SLACK_ACTIVE_CHANNEL_ID;

if (!slackAuthToken) throw new Error('Missint Slack Auth Token');
if (!slackBotToken) throw new Error('Missing Slack Bot Token');
if (!slackWatcherChannelId) throw new Error('Missing Slack Watcher Channel ID');
if (!slackTestChannelId) throw new Error('Missing Slack Test Channel ID');
if (!slackActiveChannelId) throw new Error('Missing Slack Active Channel ID');
if (!githubAccessToken) throw new Error('Missing Github Access Token');

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
const slackClient = getSlackClient({
  external: { slackAuthToken, slackWatcherChannelId, slackTestChannelId, slackActiveChannelId },
});
const githubClient = getGithubClient({ external: { githubAccessToken } });
const githubRepostitory = getGithubRepository({ clients: [githubClient] });
const logService = getLogService();
const dashboardService = getDashboardService({ repositories: [githubRepostitory] });
const slackService = getSlackService({ clients: [slackClient], services: [logService, dashboardService] });
const teamService = getTeamService({ clients: [slackClient], repositories: [githubRepostitory] });
const slackController = getSlackController({ services: [slackService], external: { slackBotToken } });
const dashboardController = getDashboardController({ services: [slackService] });

/**
██████╗ ███████╗ ██████╗██╗      █████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝
██║  ██║█████╗  ██║     ██║     ███████║██████╔╝█████╗  
██║  ██║██╔══╝  ██║     ██║     ██╔══██║██╔══██╗██╔══╝  
██████╔╝███████╗╚██████╗███████╗██║  ██║██║  ██║███████╗
╚═════╝ ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 */

cron.schedule('0 2 * * 1', () => dashboardController.sendGithubTopRepositoriesLastWeek());
app.post('/slack/action-endpoint', express.json(), (req, res) => slackController.handleEventRequest(req, res));

/**
███████╗████████╗ █████╗ ██████╗ ████████╗
██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝
███████╗   ██║   ███████║██████╔╝   ██║   
╚════██║   ██║   ██╔══██║██╔══██╗   ██║   
███████║   ██║   ██║  ██║██║  ██║   ██║   
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
 */
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
