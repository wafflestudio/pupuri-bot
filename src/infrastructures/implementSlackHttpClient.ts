import { type SlackClient } from '../clients/SlackClient';
import { type SlackChannel } from '../entities/Slack';

type Deps = {
  external: { slackAuthToken: string };
  channelIds: Record<SlackChannel, string>;
};
export const implementSlackHttpClient = ({ external: { slackAuthToken }, channelIds: channels }: Deps): SlackClient => {
  return {
    sendMessage: async (channel: SlackChannel, text: string) => {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackAuthToken}` },
        body: JSON.stringify({ channel: channels[channel], text }),
      });
      const data = await response.json();
      if (!data.ok) throw data;
      return data;
    },
  };
};
