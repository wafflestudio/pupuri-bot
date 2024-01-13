import { type SlackClient } from '../clients/SlackClient';
import { type GithubApiRepository } from '../repositories/GithubApiRepository';
import { type DashboardService } from '../services/DashboardService';

export const implementDashboardService = ({
  githubApiRepository,
  slackClient,
}: {
  githubApiRepository: GithubApiRepository;
  slackClient: SlackClient;
}): DashboardService => {
  return {
    sendGithubTopRepositoriesLastWeek: async (organization: string) => {
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories(organization, {
        sort: 'pushed',
        perPage: 30,
      });
      const repoWithDetails = await Promise.all(
        repos.map(async (repo) => {
          const recentMergedPullRequests = (
            await githubApiRepository.listRepositoryPullRequests(organization, repo.name, {
              perPage: 100,
              sort: 'updated',
              state: 'closed',
              direction: 'desc',
            })
          ).filter((pr) => pr.merged_at && new Date(pr.merged_at) > aWeekAgo);

          const recentCreatedComments = (
            await githubApiRepository.listRepositoryComments(organization, repo.name, {
              perPage: 100,
              sort: 'created_at',
              direction: 'desc',
            })
          ).filter((c) => new Date(c.created_at) > aWeekAgo);

          const score = recentMergedPullRequests.length * 5 + recentCreatedComments.length * 1;

          if (score === 0) return [];

          return [
            {
              repository: repo,
              score,
              details: {
                pullRequestCount: recentMergedPullRequests.length,
                commentCount: recentCreatedComments.length,
              },
            },
          ];
        }),
      );

      const topRepositories = repoWithDetails.flat().sort((a, b) => b.score - a.score);
      const topRepositoriesLength = 5;

      const data = topRepositories.slice(0, topRepositoriesLength);
      const divider = '---------------------------------------------';
      const title = `*:github: Top ${topRepositoriesLength} Repositories Last Week* :blob-clap:`;
      const maxPointStringLength = `${Math.max(...data.map((item) => item.score))}`.length;
      const repositories = data
        .map(({ repository: { html_url, name }, score, details: { commentCount, pullRequestCount } }, i) => {
          const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
          return `${rankEmojis[i]} [${scoreString}p] <${html_url}|*${name}*> (${pullRequestCount} pull requests, ${commentCount} comments)`;
        })
        .join('\n\n');
      await slackClient.sendMessage([divider, title, divider, repositories].join('\n'));
    },
  };
};

const rankEmojis = [':first_place_medal:', ':second_place_medal:', ':third_place_medal:', ':four:', ':five:'];
