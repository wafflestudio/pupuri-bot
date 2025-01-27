import type { Member } from '../entities/Member';

/*
 * API
 * @see https://wafflestudio.slack.com/archives/C06H0PJPDNH/p1720256977566729?thread_ts=1707317300.593519&cid=C06H0PJPDNH
 */
export const implementMemberWaffleDotComRepository = (): {
  getAllMembers: () => Promise<{ members: Member[] }>;
} => {
  return {
    getAllMembers: async () => {
      const users = await fetch(
        'https://wadot-api.wafflestudio.com/api/v1/users',
        {
          method: 'GET',
        },
      ).then(
        (res) =>
          res.json() as Promise<{ github_id: string; slack_id: string }[]>,
      );

      return {
        members: users.map((user) => ({
          slackUserId: user.slack_id,
          githubUsername: user.github_id,
        })),
      };
    },
  };
};
