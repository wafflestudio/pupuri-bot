import { type SlackEvent } from '../entities/Slack';
import { MessengerPresenter } from '../presenters/MessengerPresenter';

export type SlackEventService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => void;
};

export const implementSlackEventService = ({
  messengerPresenter,
}: {
  messengerPresenter: MessengerPresenter;
}): SlackEventService => {
  return {
    handleVerification: (body) => body.challenge,
    handleEvent: (event) => {
      switch (event.type) {
        case 'channel_archive':
          messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel)} 채널이 보관되었어요`,
          }));
          break;
        case 'channel_created':
          messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel.id)} 채널이 생성되었어요`,
          }));
          break;
        case 'channel_rename':
          messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel.id)} 채널 이름이 변경되었어요`,
          }));
          break;
        case 'channel_unarchive':
          messengerPresenter.sendMessage(({ formatChannel }) => ({
            text: `${formatChannel(event.channel)} 채널이 보관 취소되었어요`,
          }));
          break;
      }
    },
  };
};
