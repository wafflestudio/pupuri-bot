import { type SlackEvent } from '../entities/Slacka';

export type SlackEventService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => void;
};
