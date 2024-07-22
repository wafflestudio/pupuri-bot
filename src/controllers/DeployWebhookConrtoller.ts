export type DeployWebhookController = {
  handle: (body: unknown) => Promise<unknown>;
};
