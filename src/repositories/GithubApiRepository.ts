import { type Comment, type PullRequest, type Repository } from '../entities/GitHub';

export type GithubApiRepository = {
  listOrganizationRepositories: (args: {
    organization: string;
    options?: { perPage?: number; sort?: 'pushed' };
  }) => Promise<Repository[]>;
  listRepositoryPullRequests: (args: {
    organization: string;
    repository: string;
    options?: {
      perPage?: number;
      sort?: 'created' | 'updated' | 'popularity' | 'long-running';
      state?: 'closed';
      direction?: 'desc';
    };
  }) => Promise<PullRequest[]>; // 최근 업데이트된 100개만
  listRepositoryComments: (args: {
    organization: string;
    repository: string;
    options?: { perPage?: number; sort?: 'created_at'; direction?: 'desc' };
  }) => Promise<Comment[]>;
};
