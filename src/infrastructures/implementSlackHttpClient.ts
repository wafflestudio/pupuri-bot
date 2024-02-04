import { type SlackClient } from '../clients/SlackClient';

type Deps = {
  external: { slackAuthToken: string };
  channelId: string;
};
export const implementSlackHttpClient = ({ external: { slackAuthToken }, channelId }: Deps): SlackClient => {
  return {
    sendMessage: async (text: string, options) => {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackAuthToken}` },
        body: JSON.stringify({ channel: channelId, text, thread_ts: options?.ts }),
      });
      const data = await response.json();
      if (!data.ok) throw data;
      return data;
    },
  };
};
