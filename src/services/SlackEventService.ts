import type { AnyBlock, SlackEvent } from '@slack/web-api';
import type { MessengerPresenter } from '../presenters/MessengerPresenter';

type SlackEventService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => Promise<void>;
};

type SlackID = `U${string}`;
type Mention = `<@${SlackID}>`;
const slackIDToMention = (id: SlackID): Mention => `<@${id}>`;
const mentionToSlackID = (mention: Mention): SlackID =>
  mention.slice(2, -1) as SlackID;

export const implementSlackEventService = ({
  messengerPresenter,
  messageRepository,
  waffleRepository,
}: {
  messengerPresenter: MessengerPresenter;
  messageRepository: {
    getPermalink: (_: { channel: string; ts: string }) => Promise<{
      link: string;
    }>;
    sendMessage: (_: {
      channel: string;
      text: string;
      blocks: AnyBlock[];
    }) => Promise<void>;
  };
  waffleRepository: {
    insert: (
      _: {
        from: SlackID;
        to: SlackID;
        count: number;
        href: string;
        date: Date;
      }[],
    ) => Promise<void>;
  };
}): SlackEventService => {
  return {
    handleVerification: (body) => body.challenge,
    handleEvent: async (event) => {
      switch (event.type) {
        case 'channel_archive':
          await messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel)} 채널이 보관되었어요`,
          }));
          break;
        case 'channel_created':
          await messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel.id)} 채널이 생성되었어요`,
          }));
          break;
        case 'channel_rename':
          await messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel.id)} 채널 이름이 변경되었어요`,
          }));
          break;
        case 'channel_unarchive':
          await messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel)} 채널이 보관 취소되었어요`,
          }));
          break;
        case 'message': {
          if (
            !(
              'message' in event &&
              'user' in event.message &&
              typeof event.message.user === 'string'
            )
          )
            return;

          const user = event.message.user as SlackID;

          const count = event.message.text?.match(/:waffle:/g)?.length ?? 0;
          const targetUsers = (
            (event.message.text?.match(/<@[A-Z0-9]+>/g) ?? []) as Mention[]
          ).filter((m) => m !== slackIDToMention(user));

          if (count === 0 || targetUsers.length === 0) return;

          const href = (
            await messageRepository.getPermalink({
              channel: event.message.channel,
              ts: event.message.ts,
            })
          ).link;

          await Promise.all([
            ...[
              {
                channel: event.message.user,
                text: `*You Gave ${count} ${count === 1 ? 'Waffle' : 'Waffles'} to ${targetUsers.join(',')}!*`,
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

          return;
        }
        default:
          console.debug(`Unhandled event type: ${event.type}`);
      }
    },
  };
};
