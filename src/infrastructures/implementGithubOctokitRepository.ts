import { Octokit } from 'octokit';

import { type GithubApiRepository } from '../repositories/GithubApiRepository';

export const implementGithubOctokitRepository = ({
  githubAuthToken,
}: {
  githubAuthToken: string;
}): GithubApiRepository => {
  const octokit = new Octokit({ auth: githubAuthToken });

  return {
    listOrganizationRepositories: ({ organization, options }) =>
      octokit.rest.repos
        .listForOrg({
          org: organization,
          sort: options?.sort,
          per_page: options?.perPage,
        })
        .then((res) => res.data),

    listRepositoryPullRequests: ({ organization, repository, options }) =>
      octokit.rest.pulls
        .list({
          owner: organization,
          repo: repository,
          sort: options?.sort,
          state: options?.state,
          direction: options?.direction,
          per_page: options?.perPage,
        })
        .then((res) => res.data),

    listRepositoryComments: ({ organization, repository, options }) =>
      octokit.rest.pulls
        .listReviewCommentsForRepo({
          owner: organization,
          repo: repository,
          sort: options?.sort,
          direction: options?.direction,
          per_page: options?.perPage,
        })
        .then((res) => res.data),
  };
};
