import { type Request, type Response } from 'express';

import { type SlackService } from '../services/slack';

export type SlackController = { handleEventRequest: (req: Request, res: Response) => void };

type Deps = { services: [SlackService]; external: { slackBotToken: string } };
export const getSlackController = ({
  services: [slackService],
  external: { slackBotToken },
}: Deps): SlackController => {
  return {
    handleEventRequest: (req, res) => {
      try {
        if (req.body.token !== slackBotToken) throw new Error('403');

        // Slack event subscription verification
        if (req.body.type === 'url_verification')
          return res.status(200).send(slackService.handleVerification(req.body));

        return res.status(200).send(slackService.handleEvent(req.body.event));
      } catch (err) {
        if (!err || typeof err !== 'object' || !('message' in err)) return res.sendStatus(500);
        const errCode = Number(err.message);
        if (isNaN(errCode)) return res.sendStatus(500);
        res.sendStatus(errCode);
      }
    },
  };
};
