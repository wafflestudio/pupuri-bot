export type MessageHelper = {
  formatLink: (text: string, options: { url: string }) => string;
  formatChannel: (channelId: string) => string;
};

type MessageGetter = (helper: MessageHelper) => { text: string; options?: { ts?: string } };

export type MessengerPresenter = {
  sendMessage: (getter: MessageGetter) => Promise<{ ts: string }>;
};
