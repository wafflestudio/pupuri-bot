import { WebClient } from '@slack/web-api';
import { implementGithubOctokitRepository } from './infrastructures/implementGithubOctokitRepository';
import { implementMemberWaffleDotComRepository } from './infrastructures/implementMemberWaffleDotComRepository';
import { implementMongoAtlasWaffleRepository } from './infrastructures/implementMongoAtlasWaffleRepository';
import { implementDashboardService } from './services/DashboardService';

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const githubAccessToken = process.env.GHP_ACCESS_TOKEN;
const slackWeeklyChannelId = process.env.SLACK_WEEKLY_CHANNEL_ID;
const githubOrganization = process.env.GITHUB_ORGANIZATION;
const mongoDBUri = process.env.MONGODB_URI;

if (slackAuthToken === undefined) throw new Error('Missing Slack Auth Token');
if (githubAccessToken === undefined) throw new Error('Missing Github Access Token');
if (slackWeeklyChannelId === undefined) throw new Error('Missing Slack Weekly Channel ID');
if (githubOrganization === undefined) throw new Error('Missing Github Organization');
if (mongoDBUri === undefined) throw new Error('Missing MongoDB URI');

/**
██████╗ ███████╗██████╗ ███████╗███╗   ██╗██████╗ ███████╗███╗   ██╗ ██████╗██╗███████╗███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔════╝██╔════╝
██║  ██║█████╗  ██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ██╔██╗ ██║██║     ██║█████╗  ███████╗
██║  ██║██╔══╝  ██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║╚██╗██║██║     ██║██╔══╝  ╚════██║
██████╔╝███████╗██║     ███████╗██║ ╚████║██████╔╝███████╗██║ ╚████║╚██████╗██║███████╗███████║
╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝╚══════╝
 */

const dashboardService = implementDashboardService({
  githubApiRepository: implementGithubOctokitRepository({
    githubAuthToken: githubAccessToken,
  }),
  messageRepository: {
    sendMessage: async ({ blocks, text }) => {
      await new WebClient(slackAuthToken).chat.postMessage({
        channel: slackWeeklyChannelId,
        blocks,
        text,
      });
    },
  },
  memberRepository: implementMemberWaffleDotComRepository(),
  waffleRepository: implementMongoAtlasWaffleRepository({ mongoDBUri }),
});

dashboardService.sendWeeklyDashboard(githubOrganization).catch((error: unknown) => {
  console.error(error);
});
