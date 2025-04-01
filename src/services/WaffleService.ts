import type { AnyBlock } from '@slack/web-api';
import type { SlackID } from '../entities/Slack';
import type { Log } from '../entities/Waffle';

type WaffleService = {
  sendDashboard: ({ userId, channelId }: { userId: SlackID; channelId: string }) => Promise<void>;
};
type Mention = `<@${SlackID}>`;
const slackIDToMention = (id: SlackID): Mention => `<@${id}>`;

export const implementWaffleService = ({
  messageRepository,
  waffleRepository,
}: {
  messageRepository: {
    sendMessage: (_: { channel: string; text: string; blocks?: AnyBlock[] }) => Promise<void>;
  };
  waffleRepository: {
    listAllLogs: () => Promise<{ logs: Log[] }>;
  };
}): WaffleService => {
  return {
    sendDashboard: async ({ userId, channelId }) => {
      const { logs } = await waffleRepository.listAllLogs();

      const userStats = logs
        .reduce<{ user: SlackID; given: number; taken: number }[]>((a, c) => {
          const foundGiver = a.find((it) => it.user === c.from);
          const foundReceiver = a.find((it) => it.user === c.to);

          if (foundGiver) foundGiver.given += c.count;
          else a.push({ user: c.from, given: c.count, taken: 0 });

          if (foundReceiver) foundReceiver.taken += c.count;
          else a.push({ user: c.to, given: 0, taken: c.count });

          return a;
        }, [])
        .toSorted((a, b) => b.given + b.taken - (a.given + a.taken))
        .slice(0, 20);

      const channel = channelId.startsWith('C') ? channelId : userId;

      await messageRepository.sendMessage({
        channel,
        text: 'Waffle Dashboard',
        blocks: [
          { type: 'section', text: { type: 'mrkdwn', text: ':waffle: Waffle Dashboard' } },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: userStats
                .map(
                  (u) => `${slackIDToMention(u.user)} (\`${u.given} Given, ${u.taken} Received\`)`,
                )
                .join('\n'),
            },
          },
        ],
      });
    },
  };
};
