import type { SlackEvent, WebClient } from '@slack/web-api';
import type { SlackID } from './entities/Slack';
import { implementGitHubDeployWebhookController } from './infrastructures/implementGitHubDeployWebhookController';
import { implementMemberWaffleDotComRepository } from './infrastructures/implementMemberWaffleDotComRepository';
import { implementMongoAtlasWaffleRepository } from './infrastructures/implementMongoAtlasWaffleRepository';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';
import { implementDeploymentService } from './services/GithubDeploymentService';
import { implementSlackEventService } from './services/SlackEventService';
import { implementWaffleService } from './services/WaffleService';

import type { MongoClient } from 'mongodb';
import { z } from 'zod';
import {
  type WaffleGraphDashboardService,
  implementWaffleGraphDashboardService,
} from './services/WaffleGraphDashboardService';

export const handle = async (
  dependencies: {
    slackClient: Pick<WebClient['chat'], 'postMessage' | 'getPermalink'>;
    mongoClient: Pick<MongoClient, 'db'>;
    wadotClient: {
      listUsers: () => Promise<{ github_id: string; slack_id: string; first_name: string }[]>;
    };
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
  const waffleGraphDashboardService = implementWaffleGraphDashboardService({
    waffleRepository: implementMongoAtlasWaffleRepository(dependencies),
    memberRepository: implementMemberWaffleDotComRepository(dependencies),
  });
  const deployWebhookController = implementGitHubDeployWebhookController({
    deploymentService: implementDeploymentService({
      messengerPresenter: implementSlackPresenter({
        slackClient: dependencies.slackClient,
        channelId: env.deployWatcherChannelId,
      }),
      memberRepository: implementMemberWaffleDotComRepository(dependencies),
    }),
  });

  try {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health-check')
      return new Response('ok', { status: 200 });

    if (request.method === 'GET' && url.pathname === '/dashboard') {
      const data = await waffleGraphDashboardService.getGraphData();
      return new Response(html(data), {
        status: 200,
        headers: { 'content-type': 'text/html;charset=utf-8' },
      });
    }

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

const html = (data: Awaited<ReturnType<WaffleGraphDashboardService['getGraphData']>>) => {
  return `
<!DOCTYPE html>
<html lang="ko">
  <head>
    <title>Waffle Dashboard</title>
    <script src="//cdn.jsdelivr.net/npm/3d-force-graph"></script>
  </head>
  <body style="margin: 0">
      <div id="graph"></div>

      <script>
        const gData = {
          nodes: ${JSON.stringify(data.vertexes)},
          links: ${JSON.stringify(data.edges.map((e) => ({ source: e.from, target: e.to, count: e.count })))}
        };

        const Graph = ForceGraph3D()
          (document.getElementById('graph'))
          .nodeVal(node => node.count / 10) // use val for node size
          .nodeLabel(node => node.title)
          .linkWidth(link => link.count * 0.03) // use weight for link thickness
          .graphData(gData);
      </script>
    </body>
</html>
  `;
};
