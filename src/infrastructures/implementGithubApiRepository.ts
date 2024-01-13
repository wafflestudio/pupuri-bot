import { type GithubClient } from '../clients/GitHubClient';
import { type Comment, type Issue, type Milestone, type PullRequest, type Repository } from '../entities/GitHuba';
import { type GithubApiRepository } from '../repositories/GithubApiRepository';

export const implementGithubApiRepository = ({ githubClient }: { githubClient: GithubClient }): GithubApiRepository => {
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
