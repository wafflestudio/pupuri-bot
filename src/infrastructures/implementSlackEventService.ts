import { type SlackClient } from '../clients/SlackClient';
import { type SlackEventService } from '../services/SlackEventService';

export const implementSlackEventService = ({ slackClient }: { slackClient: SlackClient }): SlackEventService => {
  return {
    handleVerification: (body) => body.challenge,
    handleEvent: (event) => {
      switch (event.type) {
        case 'channel_archive':
          slackClient.sendMessage(`<#${event.channel}> 채널이 보관되었어요`);
          break;
        case 'channel_created':
          slackClient.sendMessage(`<#${event.channel.id}> 채널이 생성되었어요`);
          break;
        case 'channel_rename':
          slackClient.sendMessage(`<#${event.channel.id}> 채널 이름이 변경되었어요`);
          break;
        case 'channel_unarchive':
          slackClient.sendMessage(`<#${event.channel}> 채널이 보관 취소되었어요`);
          break;
      }
    },
  };
};
