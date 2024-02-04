import { type MessengerPresenter } from '../presenters/MessengerPresenter';
import { type GithubDeploymentService } from '../services/GithubDeploymentService';

const identifierToSlackTs: Record<string, string> = {};

export const implementDeploymentService = ({
  messengerPresenter,
}: {
  messengerPresenter: MessengerPresenter;
}): GithubDeploymentService => {
  return {
    handleCreateRelease: async (body) => {
      const author: string = body.release.author.login;
      const releaseBody: string = body.release.body;
      const tag: string = body.release.tag_name;
      const releaseUrl: string = body.release.html_url;
      const repository = body.repository.name;

      const changes = releaseBody.split('\n').reduce<{ content: string; contributor: string }[]>((acc, cur) => {
        const match = cur.match(/\* (.*) by @(.*) in (.*)/);
        if (!match) return acc;
        return [...acc, { content: match[1], contributor: match[2] }];
      }, []);

      const { ts } = await messengerPresenter.sendMessage(({ formatEmoji, formatLink }) => ({
        text: [
          `${formatEmoji('rocket')} *${repository}* by @${author} (${formatLink(tag, { url: releaseUrl })})`,
          ...changes.map((c) => `  - ${c.content} @${c.contributor}`),
        ].join('\n'),
      }));

      identifierToSlackTs[toIdentifier({ tag, repository })] = ts;
    },
    handleActionStart: async (body) => {
      const workflowName: string = body.workflow_run.name;
      const tag: string = body.workflow_run.head_branch;
      const repository: string = body.repository.name;
      const workflowId: number = body.workflow_run.id;
      const workflowUrl: string = body.workflow_run.html_url;

      const isDeploy = workflowName.toLowerCase().includes('deploy');
      if (!isDeploy) return;

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
    handleActionComplete: async (body) => {
      const workflowName: string = body.workflow_run.name;
      const tag: string = body.workflow_run.head_branch;
      const repository: string = body.repository.name;
      const workflowId: number = body.workflow_run.id;
      const workflowUrl: string = body.workflow_run.html_url;

      const isDeploy = workflowName.toLowerCase().includes('deploy');
      if (!isDeploy) return;

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
