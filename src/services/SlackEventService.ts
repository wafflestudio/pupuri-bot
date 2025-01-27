import type { SlackEvent } from '../entities/Slack';
import type { MessengerPresenter } from '../presenters/MessengerPresenter';

type SlackEventService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => Promise<void>;
};

export const implementSlackEventService = ({
  messengerPresenter,
}: {
  messengerPresenter: MessengerPresenter;
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
      }
    },
  };
};
