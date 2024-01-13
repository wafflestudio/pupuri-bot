import { type SlackEvent } from '../entities/Slack';

export type SlackEventService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => void;
};
