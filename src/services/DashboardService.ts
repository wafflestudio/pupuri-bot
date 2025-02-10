import type { AnyBlock } from '@slack/web-api';
import type { Member } from '../entities/Member';
import { getScore } from '../entities/Score';
import { Emoji, type SlackID } from '../entities/Slack';
import type { Log } from '../entities/Waffle';

type DashboardService = {
  sendWeeklyDashboard: (organization: string) => Promise<void>;
};

export const implementDashboardService = ({
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
}): DashboardService => {
  return {
    sendWeeklyDashboard: async (organization: string) => {
      const { members } = await memberRepository.getAllMembers();
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories({
        organization,
        options: { sort: 'pushed', perPage: 30 },
      });
      const logs = await waffleRepository.listLogs({ from: aWeekAgo, to: new Date() });
      const repoWithDetails = (
        await Promise.all(
          repos.map(async (repo) => {
            const recentMergedPullRequests = (
              await githubApiRepository.listRepositoryPullRequests({
                organization,
                repository: repo.name,
                options: {
                  perPage: 100,
                  sort: 'updated',
                  state: 'closed',
                  direction: 'desc',
                },
              })
            ).filter((pr) => pr.mergedAt !== null && pr.mergedAt > aWeekAgo);

            const recentCreatedComments = (
              await githubApiRepository.listRepositoryComments({
                organization,
                repository: repo.name,
                options: {
                  perPage: 100,
                  sort: 'created_at',
                  direction: 'desc',
                },
              })
            ).filter((c) => c.createdAt > aWeekAgo);

            return [
              {
                repository: repo,
                pullRequests: recentMergedPullRequests,
                comments: recentCreatedComments,
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
              type: 'pullRequest',
              memberGithubUsername: p.assigneeGithubUsername,
            })),
            ...r.comments.map((c) => ({
              type: 'comment',
              memberGithubUsername: c.userGithubUsername,
            })),
          ])
          .reduce<Record<string, { pullRequestCount: number; commentCount: number }>>(
            (acc, item) =>
              item.memberGithubUsername !== null
                ? {
                    ...acc,
                    [item.memberGithubUsername]: {
                      pullRequestCount:
                        (acc[item.memberGithubUsername]?.pullRequestCount ?? 0) +
                        (item.type === 'pullRequest' ? 1 : 0),
                      commentCount:
                        (acc[item.memberGithubUsername]?.commentCount ?? 0) +
                        (item.type === 'comment' ? 1 : 0),
                    },
                  }
                : acc,
            {},
          ),
      )
        .map(([member, { pullRequestCount, commentCount }]) => ({
          member,
          pullRequestCount,
          commentCount,
          score: getScore({ pullRequestCount, commentCount }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topLength);

      const topRepositories = repoWithDetails
        .map((r) => ({
          ...r,
          score: getScore({
            pullRequestCount: r.pullRequests.length,
            commentCount: r.comments.length,
          }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topLength);

      const topWaffles = logs.logs
        .reduce((acc: { slackId: SlackID; gives: number; takes: number }[], cur) => {
          const init = (slackId: SlackID) => ({ slackId, gives: 0, takes: 0 });
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
        text: `${Emoji.tada} 지난 주 통계 ${Emoji['blob-clap']}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${Emoji.tada} 지난 주 통계 ${Emoji['blob-clap']}`,
              emoji: true,
            },
          },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: `*Contributors* ${Emoji.blobgamer}` } },
          {
            type: 'section',
            fields: guard(
              topUsers.flatMap(({ member, score, pullRequestCount, commentCount }, i) => {
                const foundMember = members.find((m) => m.githubUsername === member);
                const rankEmoji = rankEmojis[i];
                if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

                return [
                  {
                    type: 'mrkdwn',
                    text: `${rankEmoji} ${foundMember !== undefined ? formatMemberMention(foundMember) : `@${member}`}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*${score}p* (${pullRequestCount} PR, ${commentCount} comments)`,
                  },
                ];
              }),
            ),
          },
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: `*Top Repositories* ${Emoji.github}` } },
          {
            type: 'section',
            fields: guard(
              topRepositories.flatMap(
                ({ repository: { webUrl, name }, score, comments, pullRequests }, i) => {
                  const rankEmoji = rankEmojis[i];
                  if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

                  return [
                    {
                      type: 'mrkdwn',
                      text: `${rankEmoji} ${formatLink(formatBold(name), { url: webUrl })}`,
                    },
                    {
                      type: 'mrkdwn',
                      text: `*${score}p* (${pullRequests.length} PR, ${comments.length} comments)`,
                    },
                  ];
                },
              ),
            ),
          },
          { type: 'divider' },
          {
            type: 'section',
            text: { type: 'mrkdwn' as const, text: `*Top Waffles* ${Emoji.waffle} ` },
          },
          {
            type: 'section',
            fields: guard(
              topWaffles.flatMap(({ slackId, gives, takes }, i) => {
                const foundMember = members.find((m) => m.slackUserId === slackId);
                const rankEmoji = rankEmojis[i];
                if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

                return [
                  {
                    type: 'mrkdwn',
                    text: `${rankEmoji} ${foundMember !== undefined ? formatMemberMention(foundMember) : `@${slackId}`}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*${gives} given, ${takes} received*`,
                  },
                ];
              }),
            ),
          },
        ],
      });
    },
  };
};

const guard = <T>(array: T[]) =>
  array.length === 0 ? [{ type: 'mrkdwn' as const, text: '-' }] : array;
