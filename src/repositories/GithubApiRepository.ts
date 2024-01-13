import { type Comment, type Issue, type Milestone, type PullRequest, type Repository } from '../entities/GitHuba';

export type GithubApiRepository = {
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
