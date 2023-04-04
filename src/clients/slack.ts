export type SlackClient = { sendMessage: (channel: Channel, text: string) => Promise<void> };

type Deps = {
  external: { slackAuthToken: string };
  channels: { [key in Channel]: string };
};
export const getSlackClient = ({ external: { slackAuthToken }, channels }: Deps): SlackClient => {
  return {
    sendMessage: async (channel: Channel, text: string) => {
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

type Channel = 'slack-watcher' | 'active' | 'project-pupuri';
