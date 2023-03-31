import { type GithubClient } from '../clients/github';
import { type Commit, type Repository } from '../entities/github';

export type GithubRepository = {
  listOrganizationRepositories: (
    organization: string,
    options?: { perPage?: number; sort?: 'created' | 'updated' | 'pushed' | 'full_name' },
  ) => Promise<Repository[]>;
  listRepositoryCommits: (
    organization: string,
    repository: string,
    options?: { since?: Date; perPage?: number },
  ) => Promise<Commit[]>;
};

type Deps = { clients: [GithubClient] };
export const getGithubRepository = ({ clients: [githubClient] }: Deps): GithubRepository => {
  return {
    listOrganizationRepositories: (org, { perPage, sort } = {}) => {
      const params = new URLSearchParams();
      if (perPage) params.append('per_page', `${perPage}`);
      if (sort) params.append('sort', sort);

      return githubClient.get<Repository[]>(`https://api.github.com/orgs/${org}/repos?${params.toString()}`);
    },
    listRepositoryCommits: (org, repo, { since, perPage } = {}) => {
      const params = new URLSearchParams();
      if (since) params.append('since', since.toISOString());
      if (perPage) params.append('per_page', `${perPage}`);

      return githubClient.get<Commit[]>(`https://api.github.com/repos/${org}/${repo}/commits?${params.toString()}`);
    },
  };
};
