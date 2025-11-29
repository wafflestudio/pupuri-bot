import { afterEach, beforeEach, describe, expect, mock, setSystemTime, test } from 'bun:test';
import type { ChatGetPermalinkResponse, ChatPostMessageResponse } from '@slack/web-api';
import { randomUUIDv7 } from 'bun';
import { handle } from './main';

type Deps = Parameters<typeof handle>[0];
type Env = Parameters<typeof handle>[1];

const BASE_URL = 'https://pupuri-api.wafflestudio.com';
const env: Env = {
  deployWatcherChannelId: randomUUIDv7(),
  NODE_ENV: 'test',
  slackBotToken: randomUUIDv7(),
  slackWatcherChannelId: randomUUIDv7(),
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
  { count: 3, date: new Date('2025-03-25T00:01:01Z'), from: 'QWER', href: '', to: 'ASDF' },
  { count: 2, date: new Date('2025-03-25T00:01:02Z'), from: 'QWER', href: '', to: 'ZXCV' },
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
const mockTruffleCapture = mock(() => Promise.resolve());
const mockWadotListUsers = mock(() => {
  return Promise.resolve([
    { github_id: 'qwer', slack_id: 'QWER' },
    { github_id: 'asdf', slack_id: 'ASDF' },
    { github_id: 'zxcv', slack_id: 'ZXCV' },
  ]);
});

const flush = () => new Promise((r) => setTimeout(() => r(null), 100));

const deps = {
  mongoClient: { db: mockMongoDb as unknown as Deps['mongoClient']['db'] },
  slackClient: { getPermalink: mockSlackGetPermalink, postMessage: mockSlackPostMessage },
  truffleClient: { capture: mockTruffleCapture },
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
      body: JSON.stringify(body),
      method: 'POST',
    });

  test('should 403 when token is wrong', async () => {
    const request = getRequest({ body: { token: 'wrong token' } });
    const response = await handle(deps, env, request);
    expect(response.status).toBe(403);
  });

  test('url verification', async () => {
    const challenge = randomUUIDv7();
    const request = getRequest({
      body: { challenge, token: env.slackBotToken, type: 'url_verification' },
    });
    const response = await handle(deps, env, request);
    expect(await response.text()).toBe(challenge);
    expect(response.status).toBe(200);
  });

  test('channel operations', async () => {
    const testChannel = async ({ event, text }: { event: unknown; text: string }) => {
      const request = getRequest({ body: { event, token: env.slackBotToken } });
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
      event: { channel: mockChannel, type: 'channel_archive' },
      text: `<#${mockChannel}> 채널이 보관되었어요`,
    });
    clearMocks();
    await testChannel({
      event: { channel: { id: mockChannel }, type: 'channel_created' },
      text: `<#${mockChannel}> 채널이 생성되었어요`,
    });
    clearMocks();
    await testChannel({
      event: { channel: { id: mockChannel }, type: 'channel_rename' },
      text: `<#${mockChannel}> 채널 이름이 변경되었어요`,
    });
    clearMocks();
    await testChannel({
      event: { channel: mockChannel, type: 'channel_unarchive' },
      text: `<#${mockChannel}> 채널이 보관 취소되었어요`,
    });
  });

  describe('give waffle', () => {
    const getRequest = ({ body }: { body: unknown }) =>
      new Request(`${BASE_URL}/slack/action-endpoint`, {
        body: JSON.stringify(body),
        method: 'POST',
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
          event: { text: '<@QWER> :waffle: :waffle:', type: 'message', user: 'ZXCV' },
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
          count: 2,
          date: new Date('2025-03-29T13:37:55Z'),
          from: 'ZXCV',
          href: mockPermalink,
          to: 'QWER',
        },
      ]);
      expect(mockSlackPostMessage).toBeCalledTimes(2);
      expect(mockSlackPostMessage).toHaveBeenCalledWith({
        blocks: [
          {
            accessory: {
              text: { text: 'View Message', type: 'plain_text' },
              type: 'button',
              url: mockPermalink,
            },
            text: { text: '*You Gave 2 Waffles to <@QWER> (3 left)*', type: 'mrkdwn' },
            type: 'section',
          },
        ],
        channel: 'ZXCV',
        text: '*You Gave 2 Waffles to <@QWER> (3 left)*',
      });
      expect(mockSlackPostMessage).toHaveBeenCalledWith({
        blocks: [
          {
            accessory: {
              text: { text: 'View Message', type: 'plain_text' },
              type: 'button',
              url: mockPermalink,
            },
            text: { text: '*You Received 2 Waffles from <@ZXCV>!*', type: 'mrkdwn' },
            type: 'section',
          },
        ],
        channel: 'QWER',
        text: '*You Received 2 Waffles from <@ZXCV>!*',
      });
    });

    test('fail case', async () => {
      const request = getRequest({
        body: {
          event: { text: '<@ZXCV> :waffle: :waffle:', type: 'message', user: 'QWER' },
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
        blocks: [
          {
            accessory: {
              text: { text: 'View Message', type: 'plain_text' },
              type: 'button',
              url: mockPermalink,
            },
            text: { text: '*You have only 0 Waffles left for today!*', type: 'mrkdwn' },
            type: 'section',
          },
        ],
        channel: 'QWER',
        text: '*You have only 0 Waffles left for today!*',
      });
    });
  });
});

describe('github webhook endpoint', () => {
  const getRequest = ({ body }: { body: unknown }) =>
    new Request(`${BASE_URL}/github/webhook-endpoint`, {
      body: JSON.stringify(body),
      method: 'POST',
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
        html_url: randomUUIDv7(),
        tag_name: randomUUIDv7(),
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
      repository: { name: releaseBody.repository.name },
      workflow_run: {
        head_branch: releaseBody.release.tag_name,
        html_url: randomUUIDv7(),
        id: randomUUIDv7(),
        name: 'deploy',
      },
    };
    const workflowStartResult = await handle(deps, env, getRequest({ body: workflowStartBody }));
    expect(workflowStartResult.status).toBe(200);
    expect(workflowStartResult.body).toBe(null);
    expect(deps.slackClient.postMessage).toBeCalledTimes(1);
    expect(deps.slackClient.postMessage).toBeCalledWith({
      channel: env.deployWatcherChannelId,
      text: `:github: :wip: workflow started <${workflowStartBody.workflow_run.html_url}|${workflowStartBody.workflow_run.id}>`,
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
      text: `:github: :done: workflow completed <${workflowEndBody.workflow_run.html_url}|${workflowEndBody.workflow_run.id}>`,
      thread_ts: mockTs,
    });
  });
});

describe('status 500 on error', () => {
  test('should work', async () => {
    const response = await handle(deps, env, null as unknown as Request);
    expect(response.status).toBe(500);
    expect(deps.truffleClient.capture).toBeCalledTimes(1);

    const param = mockTruffleCapture.mock.calls.at(0)?.at(0) as unknown as Error;

    expect(param).toBeInstanceOf(Error);
    expect(param?.message).toBe("null is not an object (evaluating 'request.url')");
  });
});
