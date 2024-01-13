import { type SlackChannel } from '../entities/Slack';

export type SlackClient = {
  sendMessage: (channel: SlackChannel, text: string) => Promise<void>;
};
