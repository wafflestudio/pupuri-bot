import { SlackEvent } from './entities/Slack';
import { implementGitHubDeployWebhookController } from './infrastructures/implementGitHubDeployWebhookController';
import { implementMemberWaffleDotComRepository } from './infrastructures/implementMemberWaffleDotComRepository';
import { implementOpenAiSummarizeRepository } from './infrastructures/implementOpenAiSummarizeRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';
import { implementDeploymentService } from './services/GithubDeploymentService';
import { implementSlackEventService } from './services/SlackEventService';

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const deployWatcherChannelId = process.env.DEPLOY_WATCHER_CHANNEL_ID;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (slackAuthToken === undefined) throw new Error('Missing Slack Auth Token');
if (slackBotToken === undefined) throw new Error('Missing Slack Bot Token');
if (slackWatcherChannelId === undefined) throw new Error('Missing Slack Watcher Channel ID');
if (deployWatcherChannelId === undefined) throw new Error('Missing Deploy Watcher Channel ID');
if (openaiApiKey === undefined) throw new Error('Missing OpenAI API Key');

const PORT = 3000;

const slackService = implementSlackEventService({
  messengerPresenter: implementSlackPresenter({
    slackAuthToken,
    channelId: slackWatcherChannelId,
  }),
});
const deployWebhookController = implementGitHubDeployWebhookController({
  deploymentService: implementDeploymentService({
    messengerPresenter: implementSlackPresenter({
      slackAuthToken,
      channelId: deployWatcherChannelId,
    }),
    summarizeLLMRepository: implementOpenAiSummarizeRepository({ openaiApiKey }),
    memberRepository: implementMemberWaffleDotComRepository(),
  }),
});

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    try {
      if (req.method === 'POST' && url.pathname === '/slack/action-endpoint') {
        const body = (await req.json()) as { token: unknown; type: string; challenge: string; event: SlackEvent };
        if (body.token !== slackBotToken) return new Response(null, { status: 403 });
        if (body.type === 'url_verification')
          return new Response(slackService.handleVerification(body), { status: 200 });
        await slackService.handleEvent(body.event);
        return new Response(null, { status: 200 });
      } else if (req.method === 'POST' && url.pathname === '/github/webhook-endpoint') {
        await deployWebhookController.handle(await req.json());
        return new Response(null, { status: 200 });
      } else {
        throw new Error();
      }
    } catch (err) {
      return new Response(null, { status: 500 });
    }
  },
});
