import dotenv from 'dotenv';

import { implementGithubOctokitRepository } from './infrastructures/implementGithubOctokitRepository';
import { implementMemberSlackRepository } from './infrastructures/implementMemberSlackRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';
import { implementDashboardService } from './services/DashboardService';

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
  memberRepository: implementMemberSlackRepository({ slackAuthToken }),
});

dashboardService.sendWeeklyDashboard(githubOrganization).catch(console.error);
