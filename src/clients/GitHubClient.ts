export type GithubClient = {
  get: <T = unknown>(url: string) => Promise<T>;
};
