import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { type SlackClient } from '../clients/slack';
import { type GithubService } from './dashboard';
import { type LogService } from './log';
import { getSlackService, type SlackService } from './slack';

describe('SlackService', () => {
  let slackService: SlackService;
  let slackClient: SlackClient;
  let logService: LogService;

  beforeEach(() => {
    slackClient = { sendMessage: jest.fn() } as unknown as SlackClient;
    logService = { logEvent: jest.fn() } as unknown as LogService;
    slackService = getSlackService({ clients: [slackClient], services: [logService, {} as GithubService] });
  });

  describe('handleVerification', () => {
    it('returns the challenge value from the body object', () => {
      const body = { challenge: 'test-challenge' };
      const result = slackService.handleVerification(body);
      expect(result).toEqual(body.challenge);
    });
  });

  describe('handleEvent', () => {
    it('logs the event to the log service', () => {
      const event = { type: 'channel_archive', channel: 'test-channel', user: 'test-user' } as const;
      slackService.handleEvent(event);
      expect(logService.logEvent).toHaveBeenCalledWith('slack', event);
    });

    it('sends a message when a channel is archived', () => {
      slackService.handleEvent({ type: 'channel_archive', channel: 'test-channel', user: 'test-user' });
      expect(slackClient.sendMessage).toHaveBeenCalledWith('slack-watcher', '<#test-channel> 채널이 보관되었어요');
    });

    it('sends a message when a channel is created', () => {
      slackService.handleEvent({
        type: 'channel_created',
        channel: { id: 'test-channel', name: 'test-channel-name', created: 1234567890, creator: 'test-user' },
      });
      expect(slackClient.sendMessage).toHaveBeenCalledWith('slack-watcher', '<#test-channel> 채널이 생성되었어요');
    });

    it('sends a message when a channel is renamed', () => {
      slackService.handleEvent({
        type: 'channel_rename',
        channel: { id: 'test-channel', name: 'test-channel-name', created: 1234567890 },
      });
      expect(slackClient.sendMessage).toHaveBeenCalledWith('slack-watcher', '<#test-channel> 채널 이름이 변경되었어요');
    });

    it('sends a message when a channel is unarchived', () => {
      slackService.handleEvent({ type: 'channel_unarchive', channel: 'test-channel', user: 'test-user' });
      expect(slackClient.sendMessage).toHaveBeenCalledWith('slack-watcher', '<#test-channel> 채널이 보관 취소되었어요');
    });
  });
});
