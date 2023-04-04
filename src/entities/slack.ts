type ChannelId = string;
type UserId = string;

/**
 * @see https://api.slack.com/events
 */

export type SlackEvent =
  | { type: 'channel_archive'; channel: ChannelId; user: UserId }
  | { type: 'channel_created'; channel: { id: ChannelId; name: string; created: number; creator: UserId } }
  | { type: 'channel_rename'; channel: { id: ChannelId; name: string; created: number } }
  | { type: 'channel_unarchive'; channel: ChannelId; user: UserId };
