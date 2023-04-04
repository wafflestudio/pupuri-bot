export type Repository = {
  name: string; // waffle-world
  url: string; // https://api.github.com/repos/wafflestudio/waffle-world
  html_url: string; // https://github.com/wafflestudio/waffle-world
  updated_at: string; // '2011-01-26T19:01:12Z';
};
export type PullRequest = {
  title: string;
  updated_at: string; // '2011-01-26T19:01:12Z';
  merged_at: string | null; // '2011-01-26T19:01:12Z';
};
export type Comment = {
  body: string; // 'LGTM!'
  created_at: string; // '2011-01-26T19:01:12Z';
};
