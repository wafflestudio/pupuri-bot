import { type Repository } from '../entities/github';
import { type GithubRepository } from '../repositories/github';

export type DashboardService = {
  getTopRepositoriesLastWeek: (organization: string) => Promise<
    {
      repository: Repository;
      score: number;
      details: { pullRequestCount: number; commentCount: number };
    }[]
  >;
};

type Deps = { repositories: [GithubRepository] };
export const getDashboardService = ({ repositories: [githubRepository] }: Deps): DashboardService => {
  return {
    getTopRepositoriesLastWeek: async (organization: string) => {
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubRepository.listOrganizationRepositories(organization, {
        sort: 'pushed',
        perPage: 30,
      });
      const repoWithDetails = await Promise.all(
        repos.map(async (repo) => {
          const recentMergedPullRequests = (
            await githubRepository.listRepositoryPullRequests(organization, repo.name, {
              perPage: 100,
              sort: 'updated',
              state: 'closed',
              direction: 'desc',
            })
          ).filter((pr) => pr.merged_at && new Date(pr.merged_at) > aWeekAgo);

          const recentCreatedComments = (
            await githubRepository.listRepositoryComments(organization, repo.name, {
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
      return repoWithDetails.flat().sort((a, b) => b.score - a.score);
    },
  };
};
