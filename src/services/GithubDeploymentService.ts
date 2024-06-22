import { type Member, members } from '../entities/Member';
import { type MessengerPresenter } from '../presenters/MessengerPresenter';

export type GithubDeploymentService = {
  handleCreateRelease: (body: {
    authorGithubUsername: string;
    otherContributors: Member[];
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

const identifierToSlackTs: Record<string, string> = {};

export const implementDeploymentService = ({
  messengerPresenter,

  summarizeLLMRepository,
}: {
  messengerPresenter: MessengerPresenter;
  summarizeLLMRepository: { summarizeReleaseNote: (content: string, options: { maxLen: number }) => Promise<string> };
}): GithubDeploymentService => {
  return {
    handleCreateRelease: async ({
      releaseNote,
      authorGithubUsername,
      otherContributors,
      tag,
      releaseUrl,
      repository,
    }) => {
      const summarized = await summarizeLLMRepository.summarizeReleaseNote(releaseNote, { maxLen: 100 });

      const { ts } = await messengerPresenter.sendMessage(({ formatMemberMention, formatEmoji }) => {
        const foundMember = members.find((m) => m === authorGithubUsername);
        const authorText = foundMember ? formatMemberMention(foundMember) : `@${authorGithubUsername}`;
        const contributorsText =
          otherContributors.length === 0
            ? ''
            : ` cc. ${otherContributors
                .map((c) => {
                  const foundContributor = members.find((m) => m === c);
                  return foundContributor ? formatMemberMention(foundContributor) : `@${c}`;
                })
                .join(', ')}`;
        return {
          text: [`${formatEmoji('rocket')} *${repository}/${tag}* ${authorText}${contributorsText}`, summarized].join(
            '\n\n',
          ),
        };
      });

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
      if (!ts) return;

      await messengerPresenter.sendMessage(({ formatEmoji, formatLink }) => ({
        text: [
          `${formatEmoji('wip')} deployment started ${formatEmoji('point_right')} ${formatLink(`${workflowId}`, {
            url: workflowUrl,
          })}`,
        ].join('\n'),
        options: { ts },
      }));
    },
    handleActionComplete: async ({ workflowName, workflowId, workflowUrl, tag, repository }) => {
      if (!isDeployWorkflow(workflowName)) return;

      const ts = identifierToSlackTs[toIdentifier({ tag, repository })];
      if (!ts) return;

      await messengerPresenter.sendMessage(({ formatEmoji, formatLink }) => ({
        text: [`${formatEmoji('tada')} deployment completed ${formatLink(`${workflowId}`, { url: workflowUrl })}`].join(
          '\n',
        ),
        options: { ts },
      }));

      delete identifierToSlackTs[toIdentifier({ tag, repository })];
    },
  };
};

const toIdentifier = ({ tag, repository }: { repository: string; tag: string }) => `${repository}:${tag}`;
const isDeployWorkflow = (workflowName: string) => workflowName.toLowerCase().includes('deploy');
