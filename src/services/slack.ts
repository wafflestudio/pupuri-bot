import { type SlackClient } from '../clients/slack';
import { type GithubService } from './github';
import { type LogService } from './log';

export type SlackService = {
  handleVerification: (body: { challenge: string }) => string;
  handleEvent: (event: SlackEvent) => void;
  sendGithubTopRepositoriesLastWeek: () => void;
};

type Deps = { clients: [SlackClient]; services: [LogService, GithubService] };
export const getSlackService = ({
  clients: [slackClient],
  services: [logService, githubService],
}: Deps): SlackService => {
  return {
    handleVerification: (body) => body.challenge,
    handleEvent: (event) => {
      logService.logEvent('slack', event);

      switch (event.type) {
        case 'channel_archive':
          slackClient.sendMessage('slack-watcher', `<#${event.channel}> 채널이 보관되었어요`);
          break;
        case 'channel_created':
          slackClient.sendMessage('slack-watcher', `<#${event.channel.id}> 채널이 생성되었어요`);
          break;
        case 'channel_rename':
          slackClient.sendMessage('slack-watcher', `<#${event.channel.id}> 채널 이름이 변경되었어요`);
          break;
        case 'channel_unarchive':
          slackClient.sendMessage('slack-watcher', `<#${event.channel}> 채널이 보관 취소되었어요`);
          break;
      }
    },
    sendGithubTopRepositoriesLastWeek: async () => {
      const topRepositoriesLength = 5;
      logService.logEvent('log', 'starting sendGithubTopRepositoriesLastWeek');
      try {
        const data = (await githubService.getTopRepositoriesLastWeek('wafflestudio')).slice(0, topRepositoriesLength);
        const divider = '---------------------------------------------';
        const title = `*:github: Top ${topRepositoriesLength} Repositories Last Week* :blob-clap:`;
        const maxPointStringLength = `${Math.max(...data.map((item) => item.score))}`.length;
        const repositories = data
          .map(({ repository: { html_url, name }, score, details: { commentCount, pullRequestCount } }, i) => {
            const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
            return `${rankEmojis[i]} [${scoreString}p] <${html_url}|*${name}*> (${pullRequestCount} pull requests, ${commentCount} comments)`;
          })
          .join('\n\n');
        await slackClient.sendMessage('active', [divider, title, divider, repositories].join('\n'));
      } catch (err) {
        logService.logEvent('error', err);
      }
    },
  };
};

const rankEmojis = [':first_place_medal:', ':second_place_medal:', ':third_place_medal:', ':four:', ':five:'];

type ChannelId = string;
type UserId = string;

/**
 * @see https://api.slack.com/events
 */

type SlackEvent =
  | { type: 'channel_archive'; channel: ChannelId; user: UserId }
  | { type: 'channel_created'; channel: { id: ChannelId; name: string; created: number; creator: UserId } }
  | { type: 'channel_rename'; channel: { id: ChannelId; name: string; created: number } }
  | { type: 'channel_unarchive'; channel: ChannelId; user: UserId };
