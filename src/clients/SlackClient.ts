import { type SlackChannel } from '../entities/Slacka';

export type SlackClient = {
  sendMessage: (channel: SlackChannel, text: string) => Promise<void>;
};
