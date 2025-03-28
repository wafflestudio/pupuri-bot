import { type SlackEvent, WebClient } from '@slack/web-api';
import { z } from 'zod';
import type { SlackID } from './entities/Slack';
import { implementGitHubDeployWebhookController } from './infrastructures/implementGitHubDeployWebhookController';
import { implementMemberWaffleDotComRepository } from './infrastructures/implementMemberWaffleDotComRepository';
import { implementMongoAtlasWaffleRepository } from './infrastructures/implementMongoAtlasWaffleRepository';
import { implementOpenAiSummarizeRepository } from './infrastructures/implementOpenAiSummarizeRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';
import { implementDeploymentService } from './services/GithubDeploymentService';
import { implementSlackEventService } from './services/SlackEventService';
import { implementWaffleService } from './services/WaffleService';
const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const deployWatcherChannelId = process.env.DEPLOY_WATCHER_CHANNEL_ID;
const openaiApiKey = process.env.OPENAI_API_KEY;
const mongoDBUri = process.env.MONGODB_URI;

if (slackAuthToken === undefined) throw new Error('Missing Slack Auth Token');
if (slackBotToken === undefined) throw new Error('Missing Slack Bot Token');
if (slackWatcherChannelId === undefined) throw new Error('Missing Slack Watcher Channel ID');
if (deployWatcherChannelId === undefined) throw new Error('Missing Deploy Watcher Channel ID');
if (openaiApiKey === undefined) throw new Error('Missing OpenAI API Key');
if (mongoDBUri === undefined) throw new Error('Missing MongoDB URI');

const PORT = 3000;

const slackService = implementSlackEventService({
  messengerPresenter: implementSlackPresenter({
    slackAuthToken,
    channelId: slackWatcherChannelId,
  }),
  waffleRepository: implementMongoAtlasWaffleRepository({ mongoDBUri }),
  messageRepository: {
    getPermalink: async ({ channel, ts }) =>
      new WebClient(slackAuthToken).chat.getPermalink({ channel, message_ts: ts }).then((res) => {
        if (!res.permalink) throw new Error('Failed to get permalink');
        return { link: res.permalink };
      }),
    sendMessage: async ({ channel, text, blocks }) => {
      await new WebClient(slackAuthToken).chat.postMessage({
        channel,
        text,
        blocks,
      });
    },
  },
});
const waffleService = implementWaffleService({
  waffleRepository: implementMongoAtlasWaffleRepository({ mongoDBUri }),
  messageRepository: {
    sendMessage: async ({ channel, text, blocks }) => {
      await new WebClient(slackAuthToken).chat.postMessage({
        channel,
        text,
        blocks,
      });
    },
  },
});
const deployWebhookController = implementGitHubDeployWebhookController({
  deploymentService: implementDeploymentService({
    messengerPresenter: implementSlackPresenter({
      slackAuthToken,
      channelId: deployWatcherChannelId,
    }),
    summarizeLLMRepository: implementOpenAiSummarizeRepository({
      openaiApiKey,
    }),
    memberRepository: implementMemberWaffleDotComRepository(),
  }),
});

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    try {
      if (req.method === 'GET' && url.pathname === '/health-check')
        return new Response('ok', { status: 200 });

      if (req.method === 'POST' && url.pathname === '/slack/action-endpoint') {
        const body = (await req.json()) as {
          token: unknown;
          type: string;
          challenge: string;
          event: SlackEvent;
        };

        if (body.token !== slackBotToken) return new Response(null, { status: 403 });

        if (body.type === 'url_verification') return new Response(body.challenge, { status: 200 });

        // 3초 안에 응답하지 않으면 웹훅이 다시 들어오므로 await 하지 않고 바로 응답한다
        slackService.handleEvent(body.event);

        return new Response(null, { status: 204 });
      }

      if (req.method === 'POST' && url.pathname === '/slack/slash-command') {
        const formData = await req.formData();

        const token = formData.get('token')?.toString();
        const type = formData.get('text')?.toString();
        const userId = formData.get('user_id')?.toString();
        const channelId = formData.get('channel_id')?.toString();

        const data = z
          .object({
            type: z.literal('waffle'),
            userId: z.string(),
            channelId: z.string(),
          })
          .parse({ type, userId, channelId });

        if (token !== slackBotToken) return new Response(null, { status: 403 });

        // 3초 안에 응답하지 않으면 웹훅이 다시 들어오므로 await 하지 않고 바로 응답한다
        switch (data.type) {
          case 'waffle':
            waffleService.sendDashboard({
              userId: data.userId as SlackID,
              channelId: data.channelId,
            });
        }

        return new Response(null, { status: 204 });
      }

      if (req.method === 'POST' && url.pathname === '/github/webhook-endpoint') {
        await deployWebhookController.handle(await req.json());
        return new Response(null, { status: 200 });
      }

      return new Response(null, { status: 404 });
    } catch (_) {
      console.error(_);
      return new Response(null, { status: 500 });
    }
  },
});

console.info(`Listening on port ${PORT}`);
