import { type Commit, type Repository } from '../entities/github';
import { type GithubRepository } from '../repositories/github';

export type GithubService = {
  getTopRepositoriesLastWeek: (organization: string) => Promise<{ repository: Repository; commits: Commit[] }[]>;
};

type Deps = { repositories: [GithubRepository] };
export const getGithubService = ({ repositories: [githubRepository] }: Deps): GithubService => {
  return {
    getTopRepositoriesLastWeek: async (organization: string) => {
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubRepository.listOrganizationRepositories(organization, {
        sort: 'updated',
        perPage: 30,
      });
      const repoWithCommits = await Promise.all(
        repos.map(async (repo) => {
          const commits = await githubRepository.listRepositoryCommits(organization, repo.name, {
            since: aWeekAgo,
            perPage: 100,
          });
          return [{ repository: repo, commits }];
        }),
      );
      const sorted = repoWithCommits
        .flat()
        .slice()
        .sort((a, b) => b.commits.length - a.commits.length);
      return sorted;
    },
  };
};
