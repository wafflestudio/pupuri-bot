import { type Member } from '../entities/Member';

export type MessageHelper = {
  formatLink: (text: string, options: { url: string }) => string;
  formatEmoji: (emoji: SupportedEmoji) => string;
  formatChannel: (channelId: string) => string;
  formatBold: (text: string) => string;
  formatMemberMention: (member: Member) => string;
};

type MessageGetter = (helper: MessageHelper) => { text: string; options?: { ts?: string } };

export type MessengerPresenter = {
  sendMessage: (getter: MessageGetter) => Promise<{ ts: string }>;
};

type SupportedEmoji =
  | 'first_place_medal'
  | 'second_place_medal'
  | 'third_place_medal'
  | 'four'
  | 'five'
  | 'wip'
  | 'rocket'
  | 'tada'
  | 'point_right'
  | 'blob-clap'
  | 'github';
