export type SlackClient = { sendMessage: (channel: Channel, text: string) => void };

type Deps = { external: { slackAuthToken: string; slackWatcherChannelId: string; slackTestChannelId: string } };
export const getSlackClient = ({ external: { slackAuthToken, slackWatcherChannelId } }: Deps): SlackClient => {
  const channelIdMap = {
    'slack-watcher': slackWatcherChannelId,
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

type Channel = 'slack-watcher';
