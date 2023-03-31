import { SlackClient } from '../clients/slack';
import { Commit, Repository } from '../entities/github';
import { GithubService } from './github';
import { LogService } from './log';

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
      const data = await githubService.getTopRepositoriesLastWeek('wafflestudio');
      const divider = '---------------------------------------------';
      const title = `*:github: Top 5 Repositories Last Week* :blob-clap:`;
      const repositories = data
        .filter(({ commits }) => commits.length > 0)
        .slice(0, 5)
        .map(
          ({ repository: { url, name }, commits: { length } }, i) =>
            `${rankEmojis[i]} <${url}|*${name}*> (${length} commits)`,
        )
        .join('\n\n');
      slackClient.sendMessage('active', [divider, title, divider, repositories].join('\n'));
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
