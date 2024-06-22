export type DashboardService = {
  sendWeeklyDashboard: (organization: string) => Promise<void>;
};
