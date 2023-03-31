export type SlackClient = { sendMessage: (channel: Channel, text: string) => void };

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
  };

  return {
    sendMessage: (channel: Channel, text: string) => {
      fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackAuthToken}` },
        body: JSON.stringify({ channel: channelIdMap[channel], text }),
      });
    },
  };
};

type Channel = 'slack-watcher' | 'test' | 'active';
