import type { AnyBlock } from '@slack/web-api';
import type { Member } from '../entities/Member';
import { getScore } from '../entities/Score';
import { Emoji } from '../entities/Slack';

type DashboardService = {
  sendWeeklyDashboard: (organization: string) => Promise<void>;
};

export const implementDashboardService = ({
  githubApiRepository,
  messageRepository,
  memberRepository,
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
}): DashboardService => {
  return {
    sendWeeklyDashboard: async (organization: string) => {
      const { members } = await memberRepository.getAllMembers();
      const aWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const repos = await githubApiRepository.listOrganizationRepositories({
        organization,
        options: { sort: 'pushed', perPage: 30 },
      });
      const repoWithDetails = (
        await Promise.all(
          repos.slice(0, 3).map(async (repo) => {
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

      const topUserLength = 3;
      const topRepositoriesLength = 3;

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
        .slice(0, topUserLength);

      const topRepositories = repoWithDetails
        .map((r) => ({
          ...r,
          score: getScore({
            pullRequestCount: r.pullRequests.length,
            commentCount: r.comments.length,
          }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topRepositoriesLength);

      const divider = '---------------------------------------------';

      const formatBold = (text: string) => `*${text}*`;
      const formatLink = (text: string, { url }: { url: string }) => `<${url}|${text}>`;
      const formatMemberMention = (member: Member) => `<@${member.slackUserId}>`;

      const rankEmojis = [
        Emoji.first_place_medal,
        Emoji.second_place_medal,
        Emoji.third_place_medal,
      ];

      await messageRepository.sendMessage({
        text: `${divider}\n${Emoji.tada} 지난 주 통계 ${Emoji['blob-clap']}\n${divider}`,
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
          { type: 'section', text: { type: 'mrkdwn', text: `${Emoji.blobgamer} *Contributors*` } },
          ...topUsers.map(({ member, score, pullRequestCount, commentCount }, i) => {
            const foundMember = members.find((m) => m.githubUsername === member);
            const rankEmoji = rankEmojis[i];
            if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

            return {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `${rankEmoji} ${foundMember !== undefined ? formatMemberMention(foundMember) : `@${member}`}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*${score}p* (${pullRequestCount} PR, ${commentCount} comments)`,
                },
              ],
            };
          }),
          { type: 'divider' },
          { type: 'section', text: { type: 'mrkdwn', text: `${Emoji.github} *Top Repositories*` } },
          ...topRepositories.map(
            ({ repository: { webUrl, name }, score, comments, pullRequests }, i) => {
              const rankEmoji = rankEmojis[i];
              if (rankEmoji === undefined) throw new Error('Rank emoji is not defined');

              return {
                type: 'section',
                fields: [
                  {
                    type: 'mrkdwn',
                    text: `${rankEmoji} ${formatLink(formatBold(name), { url: webUrl })}`,
                  },
                  {
                    type: 'mrkdwn',
                    text: `*${score}p* (${pullRequests.length} PR, ${comments.length} comments)`,
                  },
                ],
              };
            },
          ),
        ],
      });
    },
  };
};
