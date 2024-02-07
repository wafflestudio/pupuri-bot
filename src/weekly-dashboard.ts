import dotenv from 'dotenv';

import { implementDashboardService } from './infrastructures/implementDashboardService';
import { implementGithubOctokitRepository } from './infrastructures/implementGithubOctokitRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';

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

const dashboardService = implementDashboardService({
  githubApiRepository: implementGithubOctokitRepository({ githubAuthToken: githubAccessToken }),
  messengerPresenter: implementSlackPresenter({ slackAuthToken, channelId: slackWeeklyChannelId }),
});

dashboardService.sendGithubTopRepositoriesLastWeek(githubOrganization).catch(console.error);
