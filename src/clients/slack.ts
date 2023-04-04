export type SlackClient = { sendMessage: (channel: Channel, text: string) => Promise<void> };

type Deps = {
  external: {
    slackAuthToken: string;
    slackWatcherChannelId: string;
    slackTestChannelId: string;
    slackActiveChannelId: string;
  };
};
export const getSlackClient = ({
  external: { slackAuthToken, slackWatcherChannelId, slackTestChannelId, slackActiveChannelId },
}: Deps): SlackClient => {
  const channelIdMap = {
    'slack-watcher': slackWatcherChannelId,
    test: slackTestChannelId,
    active: slackActiveChannelId,
    'project-pupuri': slackTestChannelId,
  };

  return {
    sendMessage: async (channel: Channel, text: string) => {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackAuthToken}` },
        body: JSON.stringify({ channel: channelIdMap[channel], text }),
      });
      const data = await response.json();
      if (!data.ok) throw data;
      return data;
    },
  };
};

type Channel = 'slack-watcher' | 'test' | 'active' | 'project-pupuri';
