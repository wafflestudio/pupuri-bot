import { WebClient } from '@slack/web-api';
import { MongoClient, ServerApiVersion } from 'mongodb';
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

const mongoClient = new MongoClient(mongoDBUri, { serverApi: ServerApiVersion.v1 });

mongoClient.connect();

process.on('exit', () => {
  mongoClient.close();
});

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
  memberRepository: implementMemberWaffleDotComRepository({
    wadotClient: {
      listUsers: () =>
        fetch('https://wadot-api.wafflestudio.com/api/v1/users').then(
          (res) =>
            res.json() as Promise<{ github_id: string; slack_id: string; first_name: string }[]>,
        ),
    },
  }),
  waffleRepository: implementMongoAtlasWaffleRepository({ mongoClient }),
});

dashboardService.sendWeeklyDashboard(githubOrganization).catch((error: unknown) => {
  console.error(error);
});
