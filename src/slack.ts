export const handleSlackEvent = async (event: SlackEvent, sendMessage: (text: string) => void) => {
  switch (event.type) {
    case 'channel_archive':
      sendMessage(`<#${event.channel}> 채널이 보관되었어요`);
      break;
    case 'channel_created':
      sendMessage(`<#${event.channel.id}> 채널이 생성되었어요`);
      break;
    case 'channel_rename':
      sendMessage(`<#${event.channel.id}> 채널 이름이 변경되었어요`);
      break;
    case 'channel_unarchive':
      sendMessage(`<#${event.channel}> 채널이 보관 취소되었어요`);
      break;
  }
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
