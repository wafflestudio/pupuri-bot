import { type SlackClient } from '../clients/slack';
import { type Label } from '../entities/github';
import { type GithubRepository } from '../repositories/github';

export type TeamService = {
  sendPupuriTeamScrum: () => Promise<void>;
};

type Deps = { clients: [SlackClient]; repositories: [GithubRepository] };
export const getTeamService = ({ clients: [slackClient], repositories: [githubRepository] }: Deps): TeamService => {
  return {
    sendPupuriTeamScrum: async () => {
      const org = 'wafflestudio';
      const repo = 'pupuri-bot';
      const [{ number }] = await githubRepository.listRepositoryMilestones(org, repo, { state: 'open' });
      const issues = await githubRepository.listRepositoryIssues(org, repo, { milestone: `${number}` });

      const titleMaxLength = 40;
      const ellipsis = '...';
      const labelToString = (label: Label) => (typeof label === 'string' ? label : label.name);
      const getIssuePriorityEmoji = (labels: Label[]) => {
        if (labels.some((label) => labelToString(label) === 'P0')) return ':rotating_light:';
        if (labels.some((label) => labelToString(label) === 'P1')) return ':sparkles:';
        if (labels.some((label) => labelToString(label) === 'P0')) return ':office_worker:';
        return ':shrug:';
      };

      const message = `*[:pupuri: Project-Pupuri Scrum]*\n이번 스프린트의 잔여 이슈들을 확인해 주세요\n${issues.reduce(
        (acc, { title, html_url, labels }) =>
          `${acc}\n- ${getIssuePriorityEmoji(labels)} <${html_url}|*${
            title.length > titleMaxLength ? title.slice(0, titleMaxLength - ellipsis.length) + ellipsis : title
          }*>`,
        '',
      )}\n\n\n<https://github.com/orgs/wafflestudio/projects/3|:point_right: 이슈 목록 보러가기>`;

      await slackClient.sendMessage('project-pupuri', message);
    },
  };
};
