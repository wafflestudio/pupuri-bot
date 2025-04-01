import type { SlackID } from './Slack';

export type Log = {
  from: SlackID;
  to: SlackID;
  count: number;
  href: string | null;
  date: Date;
};
