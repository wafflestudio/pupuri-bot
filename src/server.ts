import dotenv from 'dotenv';
import express from 'express';

import { implementDeploymentService } from './infrastructures/implementDeploymentService';
import { implementSlackEventService } from './infrastructures/implementSlackEventService';
import { implementSlackPresenter } from './infrastructures/implementSlackPresenter';

dotenv.config({ path: '.env.local' });

const slackAuthToken = process.env.SLACK_AUTH_TOKEN;
const slackBotToken = process.env.SLACK_BOT_TOKEN;
const slackWatcherChannelId = process.env.SLACK_WATCHER_CHANNEL_ID;
const deployWatcherChannelId = process.env.DEPLOY_WATCHER_CHANNEL_ID;

if (!slackAuthToken) throw new Error('Missing Slack Auth Token');
if (!slackBotToken) throw new Error('Missing Slack Bot Token');
if (!slackWatcherChannelId) throw new Error('Missing Slack Watcher Channel ID');
if (!deployWatcherChannelId) throw new Error('Missing Deploy Watcher Channel ID');

const PORT = 3000;
const app = express();

/**
██████╗ ███████╗██████╗ ███████╗███╗   ██╗██████╗ ███████╗███╗   ██╗ ██████╗██╗███████╗███████╗
██╔══██╗██╔════╝██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔════╝████╗  ██║██╔════╝██║██╔════╝██╔════╝
██║  ██║█████╗  ██████╔╝█████╗  ██╔██╗ ██║██║  ██║█████╗  ██╔██╗ ██║██║     ██║█████╗  ███████╗
██║  ██║██╔══╝  ██╔═══╝ ██╔══╝  ██║╚██╗██║██║  ██║██╔══╝  ██║╚██╗██║██║     ██║██╔══╝  ╚════██║
██████╔╝███████╗██║     ███████╗██║ ╚████║██████╔╝███████╗██║ ╚████║╚██████╗██║███████╗███████║
╚═════╝ ╚══════╝╚═╝     ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝╚══════╝                                    
 */
const slackService = implementSlackEventService({
  messengerPresenter: implementSlackPresenter({
    slackAuthToken,
    channelId: slackWatcherChannelId,
  }),
});
const deploymentService = implementDeploymentService({
  messengerPresenter: implementSlackPresenter({
    slackAuthToken,
    channelId: deployWatcherChannelId,
  }),
});

/**
██████╗ ███████╗ ██████╗██╗      █████╗ ██████╗ ███████╗
██╔══██╗██╔════╝██╔════╝██║     ██╔══██╗██╔══██╗██╔════╝
██║  ██║█████╗  ██║     ██║     ███████║██████╔╝█████╗  
██║  ██║██╔══╝  ██║     ██║     ██╔══██║██╔══██╗██╔══╝  
██████╔╝███████╗╚██████╗███████╗██║  ██║██║  ██║███████╗
╚═════╝ ╚══════╝ ╚═════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
 */

app.post('/slack/action-endpoint', express.json(), (req, res) => {
  try {
    if (req.body.token !== slackBotToken) throw new Error('403');

    // Slack event subscription verification
    if (req.body.type === 'url_verification') return res.status(200).send(slackService.handleVerification(req.body));

    return res.status(200).send(slackService.handleEvent(req.body.event));
  } catch (err) {
    if (!err || typeof err !== 'object' || !('message' in err)) return res.sendStatus(500);
    const errCode = Number(err.message);
    if (isNaN(errCode)) return res.sendStatus(500);
    res.sendStatus(errCode);
  }
});

app.post('/github/webhook-endpoint', express.json(), async (req, res) => {
  if ('release' in req.body && req.body.action === 'released') await deploymentService.handleCreateRelease(req.body);
  if ('workflow_run' in req.body && req.body.action === 'requested')
    await deploymentService.handleActionStart(req.body);
  if ('workflow_run' in req.body && req.body.action === 'completed')
    await deploymentService.handleActionComplete(req.body);
  res.sendStatus(200);
});

/**
███████╗████████╗ █████╗ ██████╗ ████████╗
██╔════╝╚══██╔══╝██╔══██╗██╔══██╗╚══██╔══╝
███████╗   ██║   ███████║██████╔╝   ██║   
╚════██║   ██║   ██╔══██║██╔══██╗   ██║   
███████║   ██║   ██║  ██║██║  ██║   ██║   
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
 */
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));
