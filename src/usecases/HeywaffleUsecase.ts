import type { AnyBlock, MessageEvent } from '@slack/web-api';
import type { SlackID } from '../entities/Slack';
import type { Log } from '../entities/Waffle';
import { getTodayStartAsKST } from '../utils/getTodayStartAsKST';

type HeywaffleUsecase = {
  handleSlackMessage: (event: MessageEvent) => Promise<void>;
};

type Mention = `<@${SlackID}>`;
const slackIDToMention = (id: SlackID): Mention => `<@${id}>`;
const mentionToSlackID = (mention: Mention): SlackID => mention.slice(2, -1) as SlackID;

export const getHeywaffleUsecase = ({
  messageRepository,
  waffleRepository,
}: {
  messageRepository: {
    getPermalink: (_: { channel: string; ts: string }) => Promise<{ link: string }>;
    sendMessage: (_: { channel: string; text: string; blocks?: AnyBlock[] }) => Promise<void>;
  };
  waffleRepository: {
    insert: (_: Log[]) => Promise<void>;
    listLogs: (_: { from: Date; to: Date }) => Promise<{ logs: Log[] }>;
  };
}): HeywaffleUsecase => {
  return {
    handleSlackMessage: async (event) => {
      if (!('user' in event && typeof event.user === 'string' && event.subtype === undefined))
        return;
      const user = event.user as SlackID;
      const targetUsers = ((event.text?.match(/<@[A-Z0-9]+>/g) ?? []) as Mention[]).filter(
        (m) => m !== slackIDToMention(user),
      );

      if (targetUsers.length === 0) return;

      const todayGivenCount = (
        await waffleRepository.listLogs({
          from: getTodayStartAsKST(new Date()),
          to: new Date(),
        })
      ).logs
        .filter((l) => l.from === user)
        .reduce((a, c) => a + c.count, 0);
      const dayMax = 5;
      const left = dayMax - todayGivenCount;

      const count = event.text?.match(/:waffle:/g)?.length ?? 0;

      if (count === 0) return;
      const total = count * targetUsers.length;

      const href = (
        await messageRepository.getPermalink({
          channel: event.channel,
          ts: event.ts,
        })
      ).link;

      if (left < total) {
        await messageRepository.sendMessage({
          channel: event.user,
          text: `*You have only ${left} ${left === 1 ? 'Waffle' : 'Waffles'} left for today!*`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*You have only ${left} ${left === 1 ? 'Waffle' : 'Waffles'} left for today!*`,
              },
              accessory: {
                type: 'button',
                text: { type: 'plain_text', text: 'View Message' },
                url: href,
              },
            },
          ],
        });
        return;
      }

      await Promise.all([
        ...[
          {
            channel: event.user,
            text: `*You Gave ${count} ${count === 1 ? 'Waffle' : 'Waffles'} to ${targetUsers.join(',')} (${left - total} left)*`,
          },
          ...targetUsers.map((u) => ({
            channel: mentionToSlackID(u),
            text: `*You Received ${count} ${count === 1 ? 'Waffle' : 'Waffles'} from ${slackIDToMention(user)}!*`,
          })),
        ].map(({ channel, text }) =>
          messageRepository.sendMessage({
            channel,
            text,
            blocks: [
              {
                type: 'section',
                text: { type: 'mrkdwn', text },
                accessory: {
                  type: 'button',
                  text: { type: 'plain_text', text: 'View Message' },
                  url: href,
                },
              },
            ],
          }),
        ),

        waffleRepository.insert(
          targetUsers.map((targetUser) => ({
            from: user,
            to: mentionToSlackID(targetUser),
            count,
            href,
            date: new Date(),
          })),
        ),
      ]);
    },
  };
};
