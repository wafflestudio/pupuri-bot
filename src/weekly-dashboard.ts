import dotenv from 'dotenv';

import { implementDashboardService } from './infrastructures/implementDashboardService';
import { implementGithubApiRepository } from './infrastructures/implementGithubApiRepository';
import { implementGithubHttpClient } from './infrastructures/implementGithubHttpClient';
import { implementSlackHttpClient } from './infrastructures/implementSlackHttpClient';

dotenv.config({ path: '.env.local' });

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const githubAccessToken = process.env.GHP_ACCESS_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const slackActiveChannelId = process.env.SLACK_ACTIVE_CHANNEL_ID;

if (!slackAuthToken) throw new Error('Missing Slack Auth Token');
if (!githubAccessToken) throw new Error('Missing Github Access Token');
if (!slackWatcherChannelId) throw new Error('Missing Slack Watcher Channel ID');
if (!slackActiveChannelId) throw new Error('Missing Slack Active Channel ID');

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

dashboardService.sendGithubTopRepositoriesLastWeek('wafflestudio');
