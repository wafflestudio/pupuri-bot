import { Octokit } from 'octokit';
import type { getWeeklyWaffleStudioDashboardUsecase } from '../usecases/WeeklyWaffleStudioDashboardUsecase';

export const implementGithubOctokitRepository = ({
  githubAuthToken,
}: {
  githubAuthToken: string;
}): Parameters<typeof getWeeklyWaffleStudioDashboardUsecase>[0]['githubApiRepository'] => {
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
            assigneeGithubUsername: d.assignee?.login ?? d.user?.login ?? null,
            mergedAt: d.merged_at !== null ? new Date(d.merged_at) : null,
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
          res.data.map((d) => ({
            body: d.body,
            userGithubUsername: d.user.login,
            createdAt: new Date(d.created_at),
          })),
        ),
  };
};
