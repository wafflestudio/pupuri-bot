import type { WebClient } from '@slack/web-api';
import type { MessageHelper, MessengerPresenter } from '../presenters/MessengerPresenter';

export const implementSlackPresenter = ({
  slackClient,
  channelId,
}: {
  slackClient: Pick<WebClient['chat'], 'postMessage'>;
  channelId: string;
}): MessengerPresenter => {
  return {
    sendMessage: async (getter) => {
      const { text, options } = getter(helpers);
      const response = await slackClient.postMessage({
        channel: channelId,
        text,
        thread_ts: options?.ts,
      });

      if (response.ts === undefined) throw new Error('ts is undefined');

      return { ts: response.ts };
    },
  };
};

const escapeSymbols = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const helpers: MessageHelper = {
  formatBold: (text: string) => `*${text}*`,
  formatChannel: (channelId: string) => `<#${channelId}>`,
  formatCodeBlock: (text: string) => `\`\`\`${text}\`\`\``,
  formatEmoji: (emoji: string) => `:${emoji}:`,
  formatLink: (text: string, options: { url: string }) => `<${options.url}|${escapeSymbols(text)}>`,
  formatMemberMention: (member) => `<@${member.slackUserId}>`,
};
