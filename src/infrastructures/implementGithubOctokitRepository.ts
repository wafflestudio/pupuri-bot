import { Octokit } from 'octokit';

import { implementDashboardService } from '../services/DashboardService';

export const implementGithubOctokitRepository = ({
  githubAuthToken,
}: {
  githubAuthToken: string;
}): Parameters<typeof implementDashboardService>[0]['githubApiRepository'] => {
  const octokit = new Octokit({ auth: githubAuthToken });

  return {
    listOrganizationRepositories: ({ organization, options }) =>
      octokit.rest.repos
        .listForOrg({
          org: organization,
          sort: options?.sort,
          per_page: options?.perPage,
        })
        .then((res) => res.data.map((d) => ({ name: d.name, webUrl: d.html_url }))),

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
        .then((res) =>
          res.data.map((d) => ({
            ...d,
            assigneeGithubUsername: d.assignee?.login ?? null,
            mergedAt: d.merged_at ? new Date(d.merged_at) : null,
          })),
        ),

    listRepositoryComments: ({ organization, repository, options }) =>
      octokit.rest.pulls
        .listReviewCommentsForRepo({
          owner: organization,
          repo: repository,
          sort: options?.sort,
          direction: options?.direction,
          per_page: options?.perPage,
        })
        .then((res) =>
          res.data.map((d) => ({ body: d.body, userGithubUsername: d.user.login, createdAt: new Date(d.created_at) })),
        ),
  };
};
