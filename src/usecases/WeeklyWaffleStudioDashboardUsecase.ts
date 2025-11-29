import type { AnyBlock } from '@slack/web-api';
import type { Member } from '../entities/Member';
import { getScore } from '../entities/Score';
import { Emoji, type SlackID } from '../entities/Slack';
import type { Log } from '../entities/Waffle';

type WeeklyWaffleStudioDashboardUsecase = {
  sendWeeklyDashboard: (organization: string) => Promise<void>;
};

export const getWeeklyWaffleStudioDashboardUsecase = ({
  githubApiRepository,
  messageRepository,
  memberRepository,
  waffleRepository,
}: {
  memberRepository: { getAllMembers: () => Promise<{ members: Member[] }> };
  githubApiRepository: {
    listOrganizationRepositories: (args: {
      organization: string;
      options?: { perPage?: number; sort?: 'pushed' };
    }) => Promise<{ name: string; webUrl: string }[]>;
    listRepositoryPullRequests: (args: {
      organization: string;
      repository: string;
      options?: {
        perPage?: number;
        sort?: 'created' | 'updated' | 'popularity' | 'long-running';
        state?: 'closed';
        direction?: 'desc';
      };
    }) => Promise<{ assigneeGithubUsername: string | null; mergedAt: Date | null }[]>; // 최근 업데이트된 100개만
    listRepositoryComments: (args: {
      organization: string;
      repository: string;
      options?: { perPage?: number; sort?: 'created_at'; direction?: 'desc' };
    }) => Promise<{ userGithubUsername: string; createdAt: Date }[]>;
  };
  messageRepository: {
    sendMessage: (_: { text: string; blocks: AnyBlock[] }) => Promise<void>;
  };
  waffleRepository: {
    listLogs: (_: { from: Date; to: Date }) => Promise<{ logs: Log[] }>;
  };
}): WeeklyWaffleStudioDashboardUsecase => {
  return {
    sendWeeklyDashboard: async (organization: string) => {
      const { members } = await memberRepository.getAllMembers();
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories({
        options: { perPage: 30, sort: 'pushed' },
        organization,
      });
      const logs = await waffleRepository.listLogs({ from: aWeekAgo, to: new Date() });
      const repoWithDetails = (
        await Promise.all(
          repos.map(async (repo) => {
            const recentMergedPullRequests = (
              await githubApiRepository.listRepositoryPullRequests({
                options: {
                  direction: 'desc',
                  perPage: 100,
                  sort: 'updated',
                  state: 'closed',
                },
                organization,
                repository: repo.name,
              })
            ).filter((pr) => pr.mergedAt !== null && pr.mergedAt > aWeekAgo);

            const recentCreatedComments = (
              await githubApiRepository.listRepositoryComments({
                options: {
                  direction: 'desc',
                  perPage: 100,
                  sort: 'created_at',
                },
                organization,
                repository: repo.name,
              })
            ).filter((c) => c.createdAt > aWeekAgo);

            return [
              {
                comments: recentCreatedComments,
                pullRequests: recentMergedPullRequests,
                repository: repo,
              },
            ];
          }),
        )
      ).flat();

      const topLength = 3;

      const topUsers = Object.entries(
        repoWithDetails
          .flatMap((r) => [
            ...r.pullRequests.map((p) => ({
              memberGithubUsername: p.assigneeGithubUsername,
              type: 'pullRequest',
            })),
            ...r.comments.map((c) => ({
              memberGithubUsername: c.userGithubUsername,
              type: 'comment',
            })),
          ])
          .reduce<Record<string, { pullRequestCount: number; commentCount: number }>>(
            (acc, item) =>
              item.memberGithubUsername !== null
                ? {
                    ...acc,
                    [item.memberGithubUsername]: {
                      commentCount:
                        (acc[item.memberGithubUsername]?.commentCount ?? 0) +
                        (item.type === 'comment' ? 1 : 0),
                      pullRequestCount:
                        (acc[item.memberGithubUsername]?.pullRequestCount ?? 0) +
                        (item.type === 'pullRequest' ? 1 : 0),
                    },
                  }
                : acc,
            {},
          ),
      )
        .map(([member, { pullRequestCount, commentCount }]) => ({
          commentCount,
          member,
          pullRequestCount,
          score: getScore({ commentCount, pullRequestCount }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topLength);

      const topRepositories = repoWithDetails
        .map((r) => ({
          ...r,
          score: getScore({
            commentCount: r.comments.length,
            pullRequestCount: r.pullRequests.length,
          }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topLength);

      const topWaffles = logs.logs
        .reduce((acc: { slackId: SlackID; gives: number; takes: number }[], cur) => {
          const init = (slackId: SlackID) => ({ gives: 0, slackId, takes: 0 });
          const giveData = acc.find((a) => a.slackId === cur.from) ?? init(cur.from);
          const takeData = acc.find((a) => a.slackId === cur.to) ?? init(cur.to);

          return [
            ...acc.filter((a) => a.slackId !== cur.from && a.slackId !== cur.to),
            { ...giveData, gives: giveData.gives + cur.count },
            { ...takeData, takes: takeData.takes + cur.count },
          ];
        }, [])
        .toSorted((a, b) => b.gives + b.takes - (a.gives + a.takes))
        .slice(0, topLength);

      const formatBold = (text: string) => `*${text}*`;
      const formatLink = (text: string, { url }: { url: string }) => `<${url}|${text}>`;
      const formatMemberMention = (member: Member) => `<@${member.slackUserId}>`;

      const rankEmojis = [
        Emoji.first_place_medal,
        Emoji.second_place_medal,
        Emoji.third_place_medal,
      ];

      await messageRepository.sendMessage({
        blocks: [
          {
            text: {
              emoji: true,
              text: `${Emoji.tada} 지난 주 통계 ${Emoji['blob-clap']}`,
              type: 'plain_text',
            },
            type: 'header',
          },
          { type: 'divider' },
          { text: { text: `*Contributors* ${Emoji.blobgamer}`, type: 'mrkdwn' }, type: 'section' },
          {
            fields: guard(
              topUsers.flatMap(({ member, score, pullRequestCount, commentCount }, i) => {
                const foundMember = members.find((m) => m.githubUsername === member);
                const rankEmoji = rankEmojis[i];
                if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

                return [
                  {
                    text: `${rankEmoji} ${foundMember !== undefined ? formatMemberMention(foundMember) : `@${member}`}`,
                    type: 'mrkdwn',
                  },
                  {
                    text: `*${score}p* (${pullRequestCount} PR, ${commentCount} comments)`,
                    type: 'mrkdwn',
                  },
                ];
              }),
            ),
            type: 'section',
          },
          { type: 'divider' },
          { text: { text: `*Top Repositories* ${Emoji.github}`, type: 'mrkdwn' }, type: 'section' },
          {
            fields: guard(
              topRepositories.flatMap(
                ({ repository: { webUrl, name }, score, comments, pullRequests }, i) => {
                  const rankEmoji = rankEmojis[i];
                  if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

                  return [
                    {
                      text: `${rankEmoji} ${formatLink(formatBold(name), { url: webUrl })}`,
                      type: 'mrkdwn',
                    },
                    {
                      text: `*${score}p* (${pullRequests.length} PR, ${comments.length} comments)`,
                      type: 'mrkdwn',
                    },
                  ];
                },
              ),
            ),
            type: 'section',
          },
          { type: 'divider' },
          {
            text: { text: `*Top Waffles* ${Emoji.waffle} `, type: 'mrkdwn' as const },
            type: 'section',
          },
          {
            fields: guard(
              topWaffles.flatMap(({ slackId, gives, takes }, i) => {
                const foundMember = members.find((m) => m.slackUserId === slackId);
                const rankEmoji = rankEmojis[i];
                if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

                return [
                  {
                    text: `${rankEmoji} ${foundMember !== undefined ? formatMemberMention(foundMember) : `@${slackId}`}`,
                    type: 'mrkdwn',
                  },
                  {
                    text: `*${gives} given, ${takes} received*`,
                    type: 'mrkdwn',
                  },
                ];
              }),
            ),
            type: 'section',
          },
        ],
        text: `${Emoji.tada} 지난 주 통계 ${Emoji['blob-clap']}`,
      });
    },
  };
};

const guard = <T>(array: T[]) =>
  array.length === 0 ? [{ text: '-', type: 'mrkdwn' as const }] : array;
