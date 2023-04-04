import { type SlackService } from '../services/slack';

export type DashboardController = { sendGithubTopRepositoriesLastWeek: () => void };

type Deps = { services: [SlackService] };
export const getDashboardController = ({ services: [slackService] }: Deps): DashboardController => {
  return {
    sendGithubTopRepositoriesLastWeek: () => slackService.sendGithubTopRepositoriesLastWeek(),
  };
};
