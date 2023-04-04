import { type SlackService } from '../services/slack';

export type GithubController = { sendGithubTopRepositoriesLastWeek: () => void };

type Deps = { services: [SlackService] };
export const getGithubController = ({ services: [slackService] }: Deps): GithubController => {
  return {
    sendGithubTopRepositoriesLastWeek: () => slackService.sendGithubTopRepositoriesLastWeek(),
  };
};
