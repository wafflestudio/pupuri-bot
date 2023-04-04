import { type GithubClient } from '../clients/github';
import { type Comment, type Issue, type Milestone, type PullRequest, type Repository } from '../entities/github';

export type GithubRepository = {
  listOrganizationRepositories: (
    organization: string,
    options?: { perPage?: number; sort?: 'pushed' },
  ) => Promise<Repository[]>;
  listRepositoryPullRequests: (
    organization: string,
    repository: string,
    options?: {
      perPage?: number;
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      state?: 'closed';
      direction?: 'desc';
    },
  ) => Promise<PullRequest[]>; // 최근 업데이트된 100개만
  listRepositoryComments: (
    organization: string,
    repository: string,
    options?: { perPage?: number; sort?: 'created_at'; direction?: 'desc' },
  ) => Promise<Comment[]>;
  listRepositoryMilestones: (
    organization: string,
    repository: string,
    options?: {
      state?: 'open';
    },
  ) => Promise<Milestone[]>;
  listRepositoryIssues: (
    organization: string,
    repository: string,
    options?: {
      milestone?: string;
    },
  ) => Promise<Issue[]>;
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
    listRepositoryPullRequests: async (org, repo, { perPage, sort, state, direction } = {}) => {
      try {
        const params = new URLSearchParams();
        if (perPage) params.append('per_page', `${perPage}`);
        if (sort) params.append('sort', sort);
        if (state) params.append('state', state);
        if (direction) params.append('direction', direction);

        const pullRequests = await githubClient.get<PullRequest[]>(
          `https://api.github.com/repos/${org}/${repo}/pulls?${params.toString()}`,
        );
        return pullRequests;
      } catch (err) {
        return [];
      }
    },
    listRepositoryComments: async (org, repo, { perPage, sort, direction } = {}) => {
      try {
        const params = new URLSearchParams();
        if (perPage) params.append('per_page', `${perPage}`);
        if (sort) params.append('sort', sort);
        if (direction) params.append('direction', direction);

        const pullRequests = await githubClient.get<Comment[]>(
          `https://api.github.com/repos/${org}/${repo}/pulls/comments?${params.toString()}`,
        );
        return pullRequests;
      } catch (err) {
        return [];
      }
    },
    listRepositoryMilestones: async (org, repo, { state } = {}) => {
      const params = new URLSearchParams();
      if (state) params.append('state', `${state}`);

      const milestones = await githubClient.get<Milestone[]>(
        `https://api.github.com/repos/${org}/${repo}/milestones?${params.toString()}`,
      );
      return milestones;
    },
    listRepositoryIssues: async (org, repo, { milestone } = {}) => {
      try {
        const params = new URLSearchParams();
        if (milestone) params.append('milestone', `${milestone}`);

        const issues = await githubClient.get<Issue[]>(
          `https://api.github.com/repos/${org}/${repo}/issues?${params.toString()}`,
        );
        return issues;
      } catch (err) {
        console.log(err);
        return [];
      }
    },
  };
};
