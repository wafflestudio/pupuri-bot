import type { Member } from '../entities/Member';
import type { MessengerPresenter } from '../presenters/MessengerPresenter';

export type GithubDeploymentService = {
  handleCreateRelease: (body: {
    authorGithubUsername: string;
    releaseNote: string;
    tag: string;
    releaseUrl: string;
    repository: string;
  }) => Promise<void>;
  handleActionStart: (body: {
    workflowName: string;
    tag: string;
    repository: string;
    workflowId: number;
    workflowUrl: string;
  }) => Promise<void>;
  handleActionComplete: (body: {
    workflowName: string;
    tag: string;
    repository: string;
    workflowId: number;
    workflowUrl: string;
  }) => Promise<void>;
};

const identifierToSlackTs: Partial<Record<string, string>> = {};

export const implementDeploymentService = ({
  messengerPresenter,
  memberRepository,
}: {
  messengerPresenter: MessengerPresenter;
  memberRepository: { getAllMembers: () => Promise<{ members: Member[] }> };
}): GithubDeploymentService => {
  return {
    handleCreateRelease: async ({
      releaseNote,
      authorGithubUsername,
      tag,
      releaseUrl,
      repository,
    }) => {
      const { members } = await memberRepository.getAllMembers();

      const { ts } = await messengerPresenter.sendMessage(
        ({ formatMemberMention, formatEmoji }) => {
          const foundMember = members.find((m) => m.githubUsername === authorGithubUsername);
          const authorText =
            foundMember !== undefined
              ? formatMemberMention(foundMember)
              : `@${authorGithubUsername}`;
          return {
            text: `${formatEmoji('rocket')} *${repository}/${tag}* ${authorText}`,
          };
        },
      );

      identifierToSlackTs[toIdentifier({ tag, repository })] = ts;

      await messengerPresenter.sendMessage(({ formatEmoji, formatCodeBlock, formatLink }) => ({
        text: [
          `${formatEmoji('memo')} ${formatLink('릴리즈 노트', { url: releaseUrl })}`,
          formatCodeBlock(releaseNote),
        ].join('\n\n'),
        options: { ts },
      }));
    },
    handleActionStart: async ({ workflowName, workflowId, workflowUrl, tag, repository }) => {
      if (!isDeployWorkflow(workflowName)) return;

      const ts = identifierToSlackTs[toIdentifier({ tag, repository })];
      if (ts === undefined) return;

      await messengerPresenter.sendMessage(({ formatEmoji, formatLink }) => ({
        text: [
          `${formatEmoji('github')} ${formatEmoji('wip')} workflow started ${formatLink(
            `${workflowId}`,
            {
              url: workflowUrl,
            },
          )}`,
        ].join('\n'),
        options: { ts },
      }));
    },
    handleActionComplete: async ({ workflowName, workflowId, workflowUrl, tag, repository }) => {
      if (!isDeployWorkflow(workflowName)) return;

      const ts = identifierToSlackTs[toIdentifier({ tag, repository })];
      if (ts === undefined) return;

      await messengerPresenter.sendMessage(({ formatEmoji, formatLink }) => ({
        text: [
          `${formatEmoji('github')} ${formatEmoji('done')} workflow completed ${formatLink(`${workflowId}`, { url: workflowUrl })}`,
        ].join('\n'),
        options: { ts },
      }));

      identifierToSlackTs[toIdentifier({ tag, repository })] = undefined;
    },
  };
};

const toIdentifier = ({ tag, repository }: { repository: string; tag: string }) =>
  `${repository}:${tag}`;
const isDeployWorkflow = (workflowName: string) => workflowName.toLowerCase().includes('deploy');
