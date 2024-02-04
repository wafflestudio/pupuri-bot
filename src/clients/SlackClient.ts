export type SlackClient = {
  sendMessage: (text: string, options?: { ts?: string }) => Promise<{ ts: string }>;
};
