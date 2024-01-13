export type DashboardService = {
  sendGithubTopRepositoriesLastWeek: (organization: string) => Promise<void>;
  sendGithubTopRepositoriesPerTeamLastDay: (organization: string) => Promise<void>;
};
