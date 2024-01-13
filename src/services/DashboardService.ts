export type DashboardService = {
  sendGithubTopRepositoriesLastWeek: (organization: string) => Promise<void>;
  sendGithubTopRepositoriesPerTeamLastThreeDays: (organization: string) => Promise<void>;
};
