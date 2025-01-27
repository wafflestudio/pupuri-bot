import type {
  MessageHelper,
  MessengerPresenter,
} from '../presenters/MessengerPresenter';

export const implementSlackPresenter = ({
  slackAuthToken,
  channelId,
}: {
  slackAuthToken: string;
  channelId: string;
}): MessengerPresenter => {
  return {
    sendMessage: (getter) => {
      const { text, options } = getter(helpers);
      return postMessage({ channelId, slackAuthToken, text, options });
    },
  };
};

const escapeSymbols = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const helpers: MessageHelper = {
  formatLink: (text: string, options: { url: string }) =>
    `<${options.url}|${escapeSymbols(text)}>`,
  formatChannel: (channelId: string) => `<#${channelId}>`,
  formatEmoji: (emoji: string) => `:${emoji}:`,
  formatBold: (text: string) => `*${text}*`,
  formatMemberMention: (member) => `<@${member.slackUserId}>`,
  formatCodeBlock: (text: string) => `\`\`\`${text}\`\`\``,
};

const postMessage = async ({
  channelId,
  slackAuthToken,
  text,
  options,
}: {
  channelId: string;
  slackAuthToken: string;
  text: string;
  options?: { ts?: string };
}) => {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${slackAuthToken}`,
    },
    body: JSON.stringify({ channel: channelId, text, thread_ts: options?.ts }),
  });
  const data = (await response.json()) as unknown;
  if (!response.ok) throw data;
  return data as { ts: string };
};
