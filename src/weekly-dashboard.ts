import dotenv from 'dotenv';

import { implementDashboardService } from './infrastructures/implementDashboardService';
import { implementGithubApiRepository } from './infrastructures/implementGithubApiRepository';
import { implementGithubHttpClient } from './infrastructures/implementGithubHttpClient';
import { implementSlackHttpClient } from './infrastructures/implementSlackHttpClient';

dotenv.config({ path: '.env.local' });

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const githubAccessToken = process.env.GHP_ACCESS_TOKEN;
const slackWeeklyChannelId = process.env.SLACK_WEEKLY_CHANNEL_ID;
const githubOrganization = process.env.GITHUB_ORGANIZATION;

if (!slackAuthToken) throw new Error('Missing Slack Auth Token');
if (!githubAccessToken) throw new Error('Missing Github Access Token');
if (!slackWeeklyChannelId) throw new Error('Missing Slack Weekly Channel ID');
if (!githubOrganization) throw new Error('Missing Github Organization');

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
  channelId: slackWeeklyChannelId,
});
const githubClient = implementGithubHttpClient({ githubAccessToken });
const githubApiRepository = implementGithubApiRepository({ githubClient });
const dashboardService = implementDashboardService({ githubApiRepository, slackClient });

dashboardService.sendGithubTopRepositoriesLastWeek(githubOrganization).catch(console.error);
