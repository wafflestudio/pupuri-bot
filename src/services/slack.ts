import { SlackClient } from '../clients/slack';
import { LogService } from './log';

export type SlackService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => void;
};

type Deps = { clients: [SlackClient]; services: [LogService] };
export const getSlackService = ({ clients: [slackClient], services: [logService] }: Deps): SlackService => {
  return {
    handleVerification: (body) => body.challenge,
    handleEvent: (event) => {
      logService.logEvent('slack', event);

      switch (event.type) {
        case 'channel_archive':
          slackClient.sendMessage('slack-watcher', `<#${event.channel}> 채널이 보관되었어요`);
          break;
        case 'channel_created':
          slackClient.sendMessage('slack-watcher', `<#${event.channel.id}> 채널이 생성되었어요`);
          break;
        case 'channel_rename':
          slackClient.sendMessage('slack-watcher', `<#${event.channel.id}> 채널 이름이 변경되었어요`);
          break;
        case 'channel_unarchive':
          slackClient.sendMessage('slack-watcher', `<#${event.channel}> 채널이 보관 취소되었어요`);
          break;
      }
    },
  };
};

type ChannelId = string;
type UserId = string;

/**
 * @see https://api.slack.com/events
 */

type SlackEvent =
  | { type: 'channel_archive'; channel: ChannelId; user: UserId }
  | { type: 'channel_created'; channel: { id: ChannelId; name: string; created: number; creator: UserId } }
  | { type: 'channel_rename'; channel: { id: ChannelId; name: string; created: number } }
  | { type: 'channel_unarchive'; channel: ChannelId; user: UserId };
