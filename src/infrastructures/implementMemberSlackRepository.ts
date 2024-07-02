import pLimit from 'p-limit';

import { Member } from '../entities/Member';

export const implementMemberSlackRepository = ({
  slackAuthToken,
}: {
  slackAuthToken: string;
}): { getAllMembers: () => Promise<{ members: Member[] }> } => {
  return {
    getAllMembers: async () => {
      const users = await fetch('https://slack.com/api/users.list', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackAuthToken}` },
      }).then((res) => res.json() as Promise<{ ok: true; members: { id: string }[] } | { ok: false }>);

      if (!users.ok) throw new Error('Failed to fetch users');

      const limit = pLimit(10);

      const fetchMemberProfile = async (member: { id: string }) => {
        const profile = await fetch(`https://slack.com/api/users.profile.get?user=${member.id}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackAuthToken}` },
        }).then(
          (res) =>
            res.json() as Promise<
              { ok: true; profile: { fields: { [githubField]?: { value: string } } } } | { ok: false }
            >,
        );

        if (!profile.ok) throw new Error('Failed to fetch profile: ' + JSON.stringify(profile));

        const githubUsername = profile.profile.fields[githubField]?.value;

        if (!githubUsername) return [];

        return [{ githubUsername: githubUsername.replace('https://github.com/', ''), slackUserId: member.id }];
      };

      return {
        members: (await Promise.all(users.members.map((member) => limit(() => fetchMemberProfile(member))))).flat(),
      };
    },
  };
};

const githubField = 'Xf01UD0C7526';
