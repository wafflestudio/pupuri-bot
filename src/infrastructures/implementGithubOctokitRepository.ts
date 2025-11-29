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
          per_page: options?.perPage,
          sort: options?.sort,
        })
        .then((res) => res.data.map((d) => ({ name: d.name, webUrl: d.html_url }))),

    listRepositoryComments: ({ organization, repository, options }) =>
      octokit.rest.pulls
        .listReviewCommentsForRepo({
          direction: options?.direction,
          owner: organization,
          per_page: options?.perPage,
          repo: repository,
          sort: options?.sort,
        })
        .then((res) =>
          res.data.map((d) => ({
            body: d.body,
            createdAt: new Date(d.created_at),
            userGithubUsername: d.user.login,
          })),
        ),

    listRepositoryPullRequests: ({ organization, repository, options }) =>
      octokit.rest.pulls
        .list({
          direction: options?.direction,
          owner: organization,
          per_page: options?.perPage,
          repo: repository,
          sort: options?.sort,
          state: options?.state,
        })
        .then((res) =>
          res.data.map((d) => ({
            ...d,
            assigneeGithubUsername: d.assignee?.login ?? d.user?.login ?? null,
            mergedAt: d.merged_at !== null ? new Date(d.merged_at) : null,
          })),
        ),
  };
};
