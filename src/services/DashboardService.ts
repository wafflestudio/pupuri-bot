import { Member } from '../entities/Member';
import { getScore } from '../entities/Score';
import { MessengerPresenter } from '../presenters/MessengerPresenter';

export type DashboardService = {
  sendWeeklyDashboard: (organization: string) => Promise<void>;
};

export const implementDashboardService = ({
  githubApiRepository,
  messengerPresenter,
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
  messengerPresenter: MessengerPresenter;
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
          repos.map(async (repo) => {
            const recentMergedPullRequests = (
              await githubApiRepository.listRepositoryPullRequests({
                organization,
                repository: repo.name,
                options: { perPage: 100, sort: 'updated', state: 'closed', direction: 'desc' },
              })
            ).filter((pr) => pr.mergedAt && pr.mergedAt > aWeekAgo);

            const recentCreatedComments = (
              await githubApiRepository.listRepositoryComments({
                organization,
                repository: repo.name,
                options: { perPage: 100, sort: 'created_at', direction: 'desc' },
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
            ...r.pullRequests.map((p) => ({ type: 'pullRequest', memberGithubUsername: p.assigneeGithubUsername })),
            ...r.comments.map((c) => ({ type: 'comment', memberGithubUsername: c.userGithubUsername })),
          ])
          .reduce<Record<string, { pullRequestCount: number; commentCount: number }>>(
            (acc, item) =>
              item.memberGithubUsername
                ? {
                    ...acc,
                    [item.memberGithubUsername]: {
                      pullRequestCount:
                        (acc[item.memberGithubUsername]?.pullRequestCount ?? 0) + (item.type === 'pullRequest' ? 1 : 0),
                      commentCount:
                        (acc[item.memberGithubUsername]?.commentCount ?? 0) + (item.type === 'comment' ? 1 : 0),
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
          score: getScore({ pullRequestCount: r.pullRequests.length, commentCount: r.comments.length }),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topRepositoriesLength);

      const divider = '---------------------------------------------';

      await messengerPresenter.sendMessage(({ formatEmoji, formatMemberMention, formatBold, formatLink }) => {
        const rankEmojis = [
          formatEmoji('first_place_medal'),
          formatEmoji('second_place_medal'),
          formatEmoji('third_place_medal'),
          formatEmoji('four'),
          formatEmoji('five'),
        ];

        return {
          text: [
            divider,
            `${formatBold(`${formatEmoji('tada')} Top Contributors & Users Last Week`)} ${formatEmoji('blob-clap')}`,
            divider,

            '\n',

            `${formatBold(`${formatEmoji('blobgamer')} Contributors`)}\n`,

            topUsers
              .map(({ member, score, pullRequestCount, commentCount }, i) => {
                const maxPointStringLength = `${Math.max(...topUsers.map((item) => item.score))}`.length;
                const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
                const foundMember = members.find((m) => m.githubUsername === member);

                return `${rankEmojis[i]} [${scoreString}p] ${foundMember ? formatMemberMention(foundMember) : `@${member}`} (${pullRequestCount} pull requests, ${commentCount} comments)`;
              })
              .join('\n'),

            '\n',

            `${formatBold(`${formatEmoji('github')} Top Repositories`)}\n`,

            topRepositories
              .map(({ repository: { webUrl, name }, score, comments, pullRequests }, i) => {
                const maxPointStringLength = `${Math.max(...topRepositories.map((item) => item.score))}`.length;
                const scoreString = `${score}`.padStart(maxPointStringLength, ' ');
                return `${rankEmojis[i]} [${scoreString}p] ${formatLink(formatBold(name), {
                  url: webUrl,
                })} (${pullRequests.length} pull requests, ${comments.length} comments)`;
              })
              .join('\n'),
          ].join('\n'),
        };
      });
    },
  };
};
