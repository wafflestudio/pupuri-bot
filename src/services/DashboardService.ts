export type DashboardService = {
  sendGithubTopRepositoriesLastWeek: (organization: string) => Promise<void>;
};
