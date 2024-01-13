export type SlackClient = {
  sendMessage: (text: string) => Promise<void>;
};
