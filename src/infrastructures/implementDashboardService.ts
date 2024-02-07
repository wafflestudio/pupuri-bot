import { type MessengerPresenter } from '../presenters/MessengerPresenter';
import { type GithubApiRepository } from '../repositories/GithubApiRepository';
import { type DashboardService } from '../services/DashboardService';

export const implementDashboardService = ({
  githubApiRepository,
  messengerPresenter,
}: {
  githubApiRepository: GithubApiRepository;
  messengerPresenter: MessengerPresenter;
}): DashboardService => {
  return {
    sendGithubTopRepositoriesLastWeek: async (organization: string) => {
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories({
        organization,
        options: { sort: 'pushed', perPage: 30 },
      });
      const repoWithDetails = await Promise.all(
        repos.map(async (repo) => {
          const recentMergedPullRequests = (
            await githubApiRepository.listRepositoryPullRequests({
              organization,
              repository: repo.name,
              options: { perPage: 100, sort: 'updated', state: 'closed', direction: 'desc' },
            })
          ).filter((pr) => pr.merged_at && new Date(pr.merged_at) > aWeekAgo);

          const recentCreatedComments = (
            await githubApiRepository.listRepositoryComments({
              organization,
              repository: repo.name,
              options: { perPage: 100, sort: 'created_at', direction: 'desc' },
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
      const maxPointStringLength = `${Math.max(...data.map((item) => item.score))}`.length;
      await messengerPresenter.sendMessage(({ formatEmoji, formatBold, formatLink }) => {
        const rankEmojis = [
          formatEmoji('first_place_medal'),
          formatEmoji('second_place_medal'),
          formatEmoji('third_place_medal'),
          formatEmoji('four'),
          formatEmoji('five'),
        ];

        return {
          text: [
            divider,
            `${formatBold(
              `${formatEmoji('github')} Top ${topRepositoriesLength} Repositories Last Week`,
            )} ${formatEmoji('blob-clap')}`,
            divider,
            data
              .map(({ repository: { html_url, name }, score, details: { commentCount, pullRequestCount } }, i) => {
                const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
                return `${rankEmojis[i]} [${scoreString}p] ${formatLink(formatBold(name), {
                  url: html_url,
                })} (${pullRequestCount} pull requests, ${commentCount} comments)`;
              })
              .join('\n\n'),
          ].join('\n'),
        };
      });
    },
  };
};
