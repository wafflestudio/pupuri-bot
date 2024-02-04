import { type MessengerPresenter } from '../presenters/MessengerPresenter';
import { type GithubDeploymentService } from '../services/GithubDeploymentService';

const identifierToSlackTs: Record<string, string> = {};

const unknown = '@unknown';

export const implementDeploymentService = ({
  messengerPresenter,
}: {
  messengerPresenter: MessengerPresenter;
}): GithubDeploymentService => {
  return {
    handleCreateRelease: async ({ changes, author, tag, releaseUrl, repository }) => {
      const { ts } = await messengerPresenter.sendMessage(({ formatMemberMention, formatEmoji, formatLink }) => ({
        text: [
          `${formatEmoji('rocket')} *${repository}* by ${author ? formatMemberMention(author) : unknown} (${formatLink(
            tag,
            { url: releaseUrl },
          )})`,
          ...changes.map((c) => ` - ${c.content} by ${c.author ? formatMemberMention(c.author) : unknown}`),
        ].join('\n'),
      }));

      identifierToSlackTs[toIdentifier({ tag, repository })] = ts;
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
