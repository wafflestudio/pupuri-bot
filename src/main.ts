import type { SlackEvent, WebClient } from '@slack/web-api';
import type { SlackID } from './entities/Slack';
import { implementGitHubDeployWebhookController } from './infrastructures/implementGitHubDeployWebhookController';
import { implementMemberWaffleDotComRepository } from './infrastructures/implementMemberWaffleDotComRepository';
import { implementMongoAtlasWaffleRepository } from './infrastructures/implementMongoAtlasWaffleRepository';
import { implementOpenAiSummarizeRepository } from './infrastructures/implementOpenAiSummarizeRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';
import { implementDeploymentService } from './services/GithubDeploymentService';
import { implementSlackEventService } from './services/SlackEventService';
import { implementWaffleService } from './services/WaffleService';

import type { MongoClient } from 'mongodb';
import type OpenAI from 'openai';
import { z } from 'zod';

export const handle = async (
  dependencies: {
    slackClient: Pick<WebClient['chat'], 'postMessage' | 'getPermalink'>;
    openaiClient: Pick<OpenAI['chat']['completions'], 'create'>;
    mongoClient: Pick<MongoClient, 'db'>;
    wadotClient: { listUsers: () => Promise<{ github_id: string; slack_id: string }[]> };
  },
  env: {
    slackBotToken: string;
    slackWatcherChannelId: string;
    deployWatcherChannelId: string;
    NODE_ENV: 'production' | 'development' | 'test' | undefined;
  },
  request: Request,
): Promise<Response> => {
  const slackService = implementSlackEventService({
    messengerPresenter: implementSlackPresenter({
      slackClient: dependencies.slackClient,
      channelId: env.slackWatcherChannelId,
    }),
    waffleRepository: implementMongoAtlasWaffleRepository(dependencies),
    messageRepository: {
      getPermalink: async ({ channel, ts }) =>
        dependencies.slackClient.getPermalink({ channel, message_ts: ts }).then((res) => {
          if (!res.permalink) throw new Error('Failed to get permalink');
          return { link: res.permalink };
        }),
      sendMessage: async ({ channel, text, blocks }) => {
        await dependencies.slackClient.postMessage({ channel, text, blocks });
      },
    },
  });
  const waffleService = implementWaffleService({
    waffleRepository: implementMongoAtlasWaffleRepository(dependencies),
    messageRepository: {
      sendMessage: async ({ channel, text, blocks }) => {
        await dependencies.slackClient.postMessage({ channel, text, blocks });
      },
    },
  });
  const deployWebhookController = implementGitHubDeployWebhookController({
    deploymentService: implementDeploymentService({
      messengerPresenter: implementSlackPresenter({
        slackClient: dependencies.slackClient,
        channelId: env.deployWatcherChannelId,
      }),
      summarizeLLMRepository: implementOpenAiSummarizeRepository(dependencies),
      memberRepository: implementMemberWaffleDotComRepository(dependencies),
    }),
  });

  const url = new URL(request.url);

  try {
    if (request.method === 'GET' && url.pathname === '/health-check')
      return new Response('ok', { status: 200 });

    if (request.method === 'POST' && url.pathname === '/slack/action-endpoint') {
      const body = (await request.json()) as {
        token: unknown;
        type: string;
        challenge: string;
        event: SlackEvent;
      };

      if (body.token !== env.slackBotToken) return new Response(null, { status: 403 });

      if (body.type === 'url_verification') return new Response(body.challenge, { status: 200 });

      // 3초 안에 응답하지 않으면 웹훅이 다시 들어오므로 await 하지 않고 바로 응답한다
      slackService.handleEvent(body.event);

      return new Response(null, { status: 204 });
    }

    if (request.method === 'POST' && url.pathname === '/slack/slash-command') {
      const formData = await request.formData();

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

      if (token !== env.slackBotToken) return new Response(null, { status: 403 });

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

    if (request.method === 'POST' && url.pathname === '/github/webhook-endpoint') {
      await deployWebhookController.handle(await request.json());
      return new Response(null, { status: 200 });
    }

    return new Response(null, { status: 404 });
  } catch (error) {
    if (env.NODE_ENV !== 'test') console.error(error);

    if (error instanceof Error && error.message === '400')
      return new Response(null, { status: 400 });

    // TODO: change to truffle sdk
    dependencies.slackClient.postMessage({
      channel: 'C05021XHMQV',
      text: error instanceof Error ? error.message : 'something went wrong',
    });

    return new Response(null, { status: 500 });
  }
};
