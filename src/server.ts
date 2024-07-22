import dotenv from 'dotenv';
import express from 'express';

import { SlackEvent } from './entities/Slack';
import { implementGitHubDeployWebhookController } from './infrastructures/implementGitHubDeployWebhookController';
import { implementMemberWaffleDotComRepository } from './infrastructures/implementMemberWaffleDotComRepository';
import { implementOpenAiSummarizeRepository } from './infrastructures/implementOpenAiSummarizeRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';
import { implementDeploymentService } from './services/GithubDeploymentService';
import { implementSlackEventService } from './services/SlackEventService';

dotenv.config({ path: '.env.local' });

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
const app = express();

/**
██████╗ ███████╗██████╗ ███████╗███╗   ██╗██████╗ ███████╗███╗   ██╗ ██████╗██╗███████╗███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔════╝██╔════╝
██║  ██║█████╗  ██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ██╔██╗ ██║██║     ██║█████╗  ███████╗
██║  ██║██╔══╝  ██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║╚██╗██║██║     ██║██╔══╝  ╚════██║
██████╔╝███████╗██║     ███████╗██║ ╚████║██████╔╝███████╗██║ ╚████║╚██████╗██║███████╗███████║
╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝╚══════╝                                    
 */
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

/**
██████╗ ███████╗ ██████╗██╗      █████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝
██║  ██║█████╗  ██║     ██║     ███████║██████╔╝█████╗  
██║  ██║██╔══╝  ██║     ██║     ██╔══██║██╔══██╗██╔══╝  
██████╔╝███████╗╚██████╗███████╗██║  ██║██║  ██║███████╗
╚═════╝ ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 */

app.post<never, string, { token: unknown; type: string; challenge: string; event: SlackEvent }>(
  '/slack/action-endpoint',
  express.json(),
  (req, res) => {
    try {
      if (req.body.token !== slackBotToken) throw new Error('403');

      // Slack event subscription verification
      if (req.body.type === 'url_verification') return res.status(200).send(slackService.handleVerification(req.body));

      slackService
        .handleEvent(req.body.event)
        .then(() => res.sendStatus(200))
        .catch(() => res.sendStatus(500));
    } catch (err) {
      if (err === null || typeof err !== 'object' || !('message' in err)) return res.sendStatus(500);
      const errCode = Number(err.message);
      if (isNaN(errCode)) return res.sendStatus(500);
      res.sendStatus(errCode);
    }
  },
);

app.post('/github/webhook-endpoint', express.json(), (req, res) => {
  deployWebhookController
    .handle(req.body)
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(500));
});

/**
███████╗████████╗ █████╗ ██████╗ ████████╗
██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝
███████╗   ██║   ███████║██████╔╝   ██║   
╚════██║   ██║   ██╔══██║██╔══██╗   ██║   
███████║   ██║   ██║  ██║██║  ██║   ██║   
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
 */
app.listen(PORT, () => {
  console.info(`Server listening on port: ${PORT}`);
});
