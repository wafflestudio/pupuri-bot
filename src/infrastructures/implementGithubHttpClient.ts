import { type GithubClient } from '../clients/GitHubClient';

export const implementGithubHttpClient = ({ githubAccessToken }: { githubAccessToken: string }): GithubClient => {
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
