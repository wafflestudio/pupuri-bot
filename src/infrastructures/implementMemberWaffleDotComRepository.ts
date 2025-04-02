import type { Member } from '../entities/Member';

/*
 * API
 * @see https://wafflestudio.slack.com/archives/C06H0PJPDNH/p1720256977566729?thread_ts=1707317300.593519&cid=C06H0PJPDNH
 */
export const implementMemberWaffleDotComRepository = ({
  wadotClient,
}: {
  wadotClient: {
    listUsers: () => Promise<{ github_id: string; slack_id: string; first_name: string }[]>;
  };
}): {
  getAllMembers: () => Promise<{ members: Member[] }>;
} => {
  return {
    getAllMembers: async () => {
      const users = await wadotClient.listUsers();

      return {
        members: users.map((user) => ({
          slackUserId: user.slack_id,
          githubUsername: user.github_id,
          name: user.first_name,
        })),
      };
    },
  };
};
