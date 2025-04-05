import type {
  ChannelArchiveEvent,
  ChannelCreatedEvent,
  ChannelRenameEvent,
  ChannelUnarchiveEvent,
} from '@slack/web-api';
import type { MessengerPresenter } from '../presenters/MessengerPresenter';

type SlackWatcherUsecase = {
  handleEvent: (
    event: ChannelArchiveEvent | ChannelCreatedEvent | ChannelRenameEvent | ChannelUnarchiveEvent,
  ) => Promise<void>;
};

export const getSlackWatcherUsecsae = ({
  messengerPresenter,
}: {
  messengerPresenter: MessengerPresenter;
}): SlackWatcherUsecase => {
  return {
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
        default:
          throw new Error('unexpected event');
      }
    },
  };
};
