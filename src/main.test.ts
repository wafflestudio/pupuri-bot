import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import type { ChatGetPermalinkResponse, ChatPostMessageResponse } from '@slack/web-api';
import { randomUUIDv7 } from 'bun';
import { handle } from './main';

type Deps = Parameters<typeof handle>[0];
type Env = Parameters<typeof handle>[1];

const BASE_URL = 'https://pupuri-api.wafflestudio.com';
const env: Env = {
  deployWatcherChannelId: randomUUIDv7(),
  slackBotToken: randomUUIDv7(),
  slackWatcherChannelId: randomUUIDv7(),
  NODE_ENV: 'test',
};
const mockChannel = 'C0101010101';
const mockTs = randomUUIDv7();
const mockPermalink = randomUUIDv7();
const mockSlackPostMessage = mock(() => {
  return Promise.resolve({ ts: mockTs } as ChatPostMessageResponse);
});
const mockSlackGetPermalink = mock(() => {
  return Promise.resolve({ permalink: mockPermalink } as ChatGetPermalinkResponse);
});
const mockMongoDbCollectionFindToArray = mock(() => [
  { from: 'QWER', to: 'ASDF', date: new Date('2025-03-25T00:01:01Z'), count: 3, href: '' },
  { from: 'QWER', to: 'ZXCV', date: new Date('2025-03-25T00:01:02Z'), count: 2, href: '' },
]);
const mockMongoDbCollectionFind = mock(() => {
  return { toArray: mockMongoDbCollectionFindToArray };
});
const mockMongoDbCollectionInsertMany = mock(() => {
  return Promise.resolve({});
});
const mockMongoDbCollection = mock(() => {
  return { find: mockMongoDbCollectionFind, insertMany: mockMongoDbCollectionInsertMany };
});
const mockMongoDb = mock(() => {
  return { collection: mockMongoDbCollection };
});
const mockWadotListUsers = mock(() => {
  return Promise.resolve([
    { slack_id: 'QWER', github_id: 'qwer' },
    { slack_id: 'ASDF', github_id: 'asdf' },
    { slack_id: 'ZXCV', github_id: 'zxcv' },
  ]);
});

const flush = () => new Promise((r) => setTimeout(() => r(null), 100));

const deps = {
  slackClient: { postMessage: mockSlackPostMessage, getPermalink: mockSlackGetPermalink },
  mongoClient: { db: mockMongoDb as unknown as Deps['mongoClient']['db'] },
  wadotClient: { listUsers: mockWadotListUsers },
} as unknown as Deps;

const clearMocks = () => {
  mockSlackPostMessage.mockClear();
  mockSlackGetPermalink.mockClear();
  mockMongoDbCollectionFindToArray.mockClear();
  mockMongoDbCollectionFind.mockClear();
  mockMongoDbCollectionInsertMany.mockClear();
  mockMongoDbCollection.mockClear();
  mockMongoDb.mockClear();
};

beforeEach(() => {
  clearMocks();
  setSystemTime(new Date('2025-03-29T13:37:55Z'));
});

afterEach(() => {
  setSystemTime();
});

describe('health check api', () => {
  const getRequest = () => new Request(`${BASE_URL}/health-check`);

  test('should work', async () => {
    const request = getRequest();
    const response = await handle(deps, env, request);
    expect(await response.text()).toBe('ok');
    expect(response.status).toBe(200);
  });
});

describe('slack event api', () => {
  const getRequest = ({ body }: { body: unknown }) =>
    new Request(`${BASE_URL}/slack/action-endpoint`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

  test('should 403 when token is wrong', async () => {
    const request = getRequest({ body: { token: 'wrong token' } });
    const response = await handle(deps, env, request);
    expect(response.status).toBe(403);
  });

  test('url verification', async () => {
    const challenge = randomUUIDv7();
    const request = getRequest({
      body: { token: env.slackBotToken, challenge, type: 'url_verification' },
    });
    const response = await handle(deps, env, request);
    expect(await response.text()).toBe(challenge);
    expect(response.status).toBe(200);
  });

  test('channel operations', async () => {
    const testChannel = async ({ event, text }: { event: unknown; text: string }) => {
      const request = getRequest({ body: { token: env.slackBotToken, event } });
      const response = await handle(deps, env, request);
      await flush();

      expect(response.status).toBe(204);
      expect(response.body).toBe(null);
      expect(deps.slackClient.postMessage).toBeCalledTimes(1);
      expect(deps.slackClient.postMessage).toBeCalledWith({
        channel: env.slackWatcherChannelId,
        text,
        thread_ts: undefined,
      });
    };
    await testChannel({
      event: { type: 'channel_archive', channel: mockChannel },
      text: `<#${mockChannel}> 채널이 보관되었어요`,
    });
    clearMocks();
    await testChannel({
      event: { type: 'channel_created', channel: { id: mockChannel } },
      text: `<#${mockChannel}> 채널이 생성되었어요`,
    });
    clearMocks();
    await testChannel({
      event: { type: 'channel_rename', channel: { id: mockChannel } },
      text: `<#${mockChannel}> 채널 이름이 변경되었어요`,
    });
    clearMocks();
    await testChannel({
      event: { type: 'channel_unarchive', channel: mockChannel },
      text: `<#${mockChannel}> 채널이 보관 취소되었어요`,
    });
  });

  describe('give waffle', () => {
    const getRequest = ({ body }: { body: unknown }) =>
      new Request(`${BASE_URL}/slack/action-endpoint`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

    test('ignore case', async () => {
      const request = getRequest({
        body: { event: { type: 'message', user: 'QWER' }, token: env.slackBotToken },
      });

      const response = await handle(deps, env, request);
      await flush();

      expect(response.body).toBe(null);
      expect(response.status).toBe(204);
      expect(mockMongoDb).toBeCalledTimes(0);
    });

    test('success case', async () => {
      const request = getRequest({
        body: {
          event: { type: 'message', user: 'ZXCV', text: '<@QWER> :waffle: :waffle:' },
          token: env.slackBotToken,
        },
      });

      const response = await handle(deps, env, request);
      await flush();

      expect(response.body).toBe(null);
      expect(response.status).toBe(204);
      expect(mockMongoDb).toBeCalledTimes(2);
      expect(mockMongoDb).toBeCalledWith('waffle');
      expect(mockMongoDbCollection).toBeCalledTimes(2);
      expect(mockMongoDbCollection).toBeCalledWith('logs');
      expect(mockMongoDbCollectionFind).toBeCalledTimes(1);
      expect(mockMongoDbCollectionFind).toBeCalledWith({
        date: { $gte: new Date('2025-03-28T15:00:00Z'), $lt: new Date('2025-03-29T13:37:55Z') },
      });
      expect(mockMongoDbCollectionFindToArray).toBeCalledTimes(1);
      expect(mockMongoDbCollectionFindToArray).toBeCalledWith();
      expect(mockMongoDbCollectionInsertMany).toBeCalledTimes(1);
      expect(mockMongoDbCollectionInsertMany).toBeCalledWith([
        {
          from: 'ZXCV',
          to: 'QWER',
          count: 2,
          href: mockPermalink,
          date: new Date('2025-03-29T13:37:55Z'),
        },
      ]);
      expect(mockSlackPostMessage).toBeCalledTimes(2);
      expect(mockSlackPostMessage).toHaveBeenCalledWith({
        channel: 'ZXCV',
        text: '*You Gave 2 Waffles to <@QWER> (3 left)*',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*You Gave 2 Waffles to <@QWER> (3 left)*' },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View Message' },
              url: mockPermalink,
            },
          },
        ],
      });
      expect(mockSlackPostMessage).toHaveBeenCalledWith({
        channel: 'QWER',
        text: '*You Received 2 Waffles from <@ZXCV>!*',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*You Received 2 Waffles from <@ZXCV>!*' },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View Message' },
              url: mockPermalink,
            },
          },
        ],
      });
    });

    test('fail case', async () => {
      const request = getRequest({
        body: {
          event: { type: 'message', user: 'QWER', text: '<@ZXCV> :waffle: :waffle:' },
          token: env.slackBotToken,
        },
      });

      const response = await handle(deps, env, request);
      await flush();

      expect(response.body).toBe(null);
      expect(response.status).toBe(204);
      expect(mockMongoDb).toBeCalledTimes(1);
      expect(mockMongoDb).toBeCalledWith('waffle');
      expect(mockMongoDbCollection).toBeCalledTimes(1);
      expect(mockMongoDbCollection).toBeCalledWith('logs');
      expect(mockMongoDbCollectionFind).toBeCalledTimes(1);
      expect(mockMongoDbCollectionFind).toBeCalledWith({
        date: { $gte: new Date('2025-03-28T15:00:00Z'), $lt: new Date('2025-03-29T13:37:55Z') },
      });
      expect(mockMongoDbCollectionFindToArray).toBeCalledTimes(1);
      expect(mockMongoDbCollectionFindToArray).toBeCalledWith();
      expect(mockMongoDbCollectionInsertMany).toBeCalledTimes(0);
      expect(mockSlackPostMessage).toBeCalledTimes(1);
      expect(mockSlackPostMessage).toHaveBeenCalledWith({
        channel: 'QWER',
        text: '*You have only 0 Waffles left for today!*',
        blocks: [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: '*You have only 0 Waffles left for today!*' },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View Message' },
              url: mockPermalink,
            },
          },
        ],
      });
    });
  });
});

describe('slack slash command', () => {
  const getRequest = ({ formData }: { formData: FormData }) =>
    new Request(`${BASE_URL}/slack/slash-command`, {
      method: 'POST',
      body: formData,
    });

  test('/pupuri waffle', async () => {
    const formData = new FormData();
    formData.append('token', env.slackBotToken);
    formData.append('text', 'waffle');
    formData.append('user_id', '1234');
    formData.append('channel_id', 'C5678');
    const request = getRequest({ formData });

    const response = await handle(deps, env, request);
    await flush();

    expect(response.body).toBe(null);
    expect(response.status).toBe(204);
    expect(mockMongoDb).toBeCalledTimes(1);
    expect(mockMongoDb).toBeCalledWith('waffle');
    expect(mockMongoDbCollection).toBeCalledTimes(1);
    expect(mockMongoDbCollection).toBeCalledWith('logs');
    expect(mockMongoDbCollectionFind).toBeCalledTimes(1);
    expect(mockMongoDbCollectionFind).toBeCalledWith();
    expect(mockMongoDbCollectionFindToArray).toBeCalledTimes(1);
    expect(mockMongoDbCollectionFindToArray).toBeCalledWith();
    expect(deps.slackClient.postMessage).toBeCalledWith({
      channel: 'C5678',
      text: 'Waffle Dashboard',
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: ':waffle: Waffle Dashboard' } },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: [
              '<@QWER> (`5 Given, 0 Taken`)',
              '<@ASDF> (`0 Given, 3 Taken`)',
              '<@ZXCV> (`0 Given, 2 Taken`)',
            ].join('\n'),
          },
        },
      ],
    });
  });
});

describe('github webhook endpoint', () => {
  const getRequest = ({ body }: { body: unknown }) =>
    new Request(`${BASE_URL}/github/webhook-endpoint`, {
      method: 'POST',
      body: JSON.stringify(body),
    });

  test('should 400 on invalid', async () => {
    const result = await handle(deps, env, getRequest({ body: {} }));
    expect(deps.slackClient.postMessage).toBeCalledTimes(0);
    expect(result.status).toBe(400);
    expect(result.body).toBe(null);
  });

  test('should ignore others', async () => {
    const result = await handle(deps, env, getRequest({ body: { action: '1234' } }));
    expect(deps.slackClient.postMessage).toBeCalledTimes(0);
    expect(result.status).toBe(200);
    expect(result.body).toBe(null);
  });

  test('success case', async () => {
    const releaseBody = {
      action: 'released',
      release: {
        author: { login: 'qwer' },
        body: randomUUIDv7(),
        tag_name: randomUUIDv7(),
        html_url: randomUUIDv7(),
      },
      repository: { name: randomUUIDv7() },
    };
    const releaseResult = await handle(deps, env, getRequest({ body: releaseBody }));
    expect(deps.slackClient.postMessage).toBeCalledTimes(2);
    expect(deps.slackClient.postMessage).toHaveBeenNthCalledWith(1, {
      channel: env.deployWatcherChannelId,
      text: `:rocket: *${releaseBody.repository.name}/${releaseBody.release.tag_name}* <@QWER>`,
      thread_ts: undefined,
    });
    expect(deps.slackClient.postMessage).toHaveBeenNthCalledWith(2, {
      channel: env.deployWatcherChannelId,
      text: `:memo: <${releaseBody.release.html_url}|릴리즈 노트>\n\n\`\`\`${releaseBody.release.body}\`\`\``,
      thread_ts: mockTs,
    });
    expect(releaseResult.status).toBe(200);
    expect(releaseResult.body).toBe(null);

    clearMocks();

    const workflowStartBody = {
      action: 'requested',
      workflow_run: {
        head_branch: releaseBody.release.tag_name,
        id: randomUUIDv7(),
        name: 'deploy',
        html_url: randomUUIDv7(),
      },
      repository: { name: releaseBody.repository.name },
    };
    const workflowStartResult = await handle(deps, env, getRequest({ body: workflowStartBody }));
    expect(workflowStartResult.status).toBe(200);
    expect(workflowStartResult.body).toBe(null);
    expect(deps.slackClient.postMessage).toBeCalledTimes(1);
    expect(deps.slackClient.postMessage).toBeCalledWith({
      channel: env.deployWatcherChannelId,
      text: `:wip: deployment started :point_right: <${workflowStartBody.workflow_run.html_url}|${workflowStartBody.workflow_run.id}>`,
      thread_ts: mockTs,
    });

    clearMocks();

    const workflowEndBody = { ...workflowStartBody, action: 'completed' };
    const workflowEndResult = await handle(deps, env, getRequest({ body: workflowEndBody }));
    expect(workflowEndResult.status).toBe(200);
    expect(workflowEndResult.body).toBe(null);
    expect(deps.slackClient.postMessage).toBeCalledTimes(1);
    expect(deps.slackClient.postMessage).toBeCalledWith({
      channel: env.deployWatcherChannelId,
      text: `:tada: deployment completed <${workflowEndBody.workflow_run.html_url}|${workflowEndBody.workflow_run.id}>`,
      thread_ts: mockTs,
    });
  });
});

describe('status 500 on error', () => {
  test('should work', async () => {
    const response = await handle(deps, env, null as unknown as Request);
    expect(response.status).toBe(500);
    expect(deps.slackClient.postMessage).toBeCalledTimes(1);
    expect(deps.slackClient.postMessage).toBeCalledWith({
      channel: 'C05021XHMQV',
      text: `null is not an object (evaluating 'request.url')`,
    });
  });
});
