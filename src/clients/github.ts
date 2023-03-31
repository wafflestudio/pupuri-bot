export type GithubClient = { get: <T = unknown>(url: string) => Promise<T> };

type Deps = { external: { githubAccessToken: string } };
export const getGithubClient = ({ external: { githubAccessToken } }: Deps): GithubClient => {
  return {
    get: async <T>(url: string): Promise<T> => {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      const data = await response.json();
      if (!response.ok) throw data;
      return data as T;
    },
  };
};
